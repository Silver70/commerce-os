import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderService } from '../../order/services/order.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from '../../../shared/events/events';

@Injectable()
export class PaymentEventHandler {
  private readonly logger = new Logger(PaymentEventHandler.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    try {
      await this.orderService.markPaid(
        event.orderId,
        event.organizationId,
        event.storeId,
      );
      await this.inventoryService.convertReservations(
        event.orderId,
        event.organizationId,
        event.storeId,
      );
      await this.auditService.log({
        entityType: 'order',
        entityId: event.orderId,
        action: 'payment_received',
        actorType: 'system',
        actorId: 'stripe',
        changes: {
          paymentIntentId: event.paymentIntentId,
          amount: event.amount,
        },
        organizationId: event.organizationId,
        storeId: event.storeId,
      });
    } catch (err) {
      this.logger.error(
        `payment.succeeded handler failed for order ${event.orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    try {
      await this.orderService.markFailed(
        event.orderId,
        event.organizationId,
        event.storeId,
      );
      await this.inventoryService.releaseReservations(
        event.orderId,
        event.organizationId,
        event.storeId,
      );
      await this.auditService.log({
        entityType: 'order',
        entityId: event.orderId,
        action: 'payment_failed',
        actorType: 'system',
        actorId: 'stripe',
        changes: {
          paymentIntentId: event.paymentIntentId,
          reason: event.reason,
        },
        organizationId: event.organizationId,
        storeId: event.storeId,
      });
    } catch (err) {
      this.logger.error(
        `payment.failed handler failed for order ${event.orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
