import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { OrderRepository } from '../repositories/order.repository';
import { AuditService } from '../../audit/services/audit.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { PAYMENT_PROVIDER } from '../../payment/interfaces/payment-provider.interface';
import type { PaymentProvider } from '../../payment/interfaces/payment-provider.interface';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { payments } from '../../../shared/database/schema';
import type { Refund } from '../../../shared/database/schema';
import { RefundIssuedEvent } from '../../../shared/events/events';

@Injectable()
export class RefundService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly auditService: AuditService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {}

  async initiateRefund(
    orderId: string,
    amount: number,
    reason: string | undefined,
    adminId: string,
    orgId: string,
    storeId: string,
  ): Promise<Refund> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');

    const payment = await this.orderRepo.findPaymentByOrderId(
      orderId,
      orgId,
      storeId,
    );
    if (!payment) throw new NotFoundException('No payment found for order');

    const validRefundableStatuses: Array<typeof order.status> = [
      'paid',
      'processing',
      'shipped',
      'delivered',
    ];
    if (!validRefundableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order in status "${order.status}" cannot be refunded`,
      );
    }

    if (amount > payment.amount) {
      throw new BadRequestException(
        `Refund amount (${amount}) exceeds payment amount (${payment.amount})`,
      );
    }

    let stripeRefundId: string | null = null;

    if (payment.provider === 'stripe') {
      if (!payment.chargeId) {
        throw new BadRequestException(
          'Payment has not been captured — no charge ID available',
        );
      }
      const result = await this.paymentProvider.refundPayment(
        payment.chargeId,
        amount,
        reason,
      );
      stripeRefundId = result.refundId;
    }

    const refund = await this.orderRepo.createRefund({
      organizationId: orgId,
      storeId,
      orderId,
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      reason: reason ?? null,
      status: 'succeeded',
      stripeRefundId,
      adminId,
    });

    const isFullRefund = amount >= payment.amount;
    await this.db
      .update(payments)
      .set({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    if (isFullRefund) {
      await this.orderRepo.updateStatus(orderId, orgId, storeId, 'refunded');
    }

    // Restore inventory for each line item
    const lineItems = await this.orderRepo.findLineItemsByOrder(orderId);
    for (const item of lineItems) {
      if (item.variantId) {
        await this.inventoryService
          .adjust(
            item.variantId,
            item.quantity,
            `Refund for order ${order.orderNumber}`,
            adminId,
            orgId,
            storeId,
          )
          .catch(() => {
            // Non-fatal: inventory restore failure should not block the refund
          });
      }
    }

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      storeId,
      orderId,
      eventType: 'refund_issued',
      message: `Refund of ${amount} ${payment.currency} issued${reason ? `: ${reason}` : ''}`,
      actorType: 'admin',
      actorId: adminId,
    });

    await this.auditService.log({
      entityType: 'order',
      entityId: orderId,
      action: 'refund_issued',
      actorType: 'admin',
      actorId: adminId,
      changes: { amount, reason, refundId: refund.id, stripeRefundId },
      organizationId: orgId,
      storeId,
    });

    this.eventEmitter.emit(
      'refund.issued',
      new RefundIssuedEvent(refund.id, orderId, orgId, storeId, amount),
    );

    return refund;
  }
}
