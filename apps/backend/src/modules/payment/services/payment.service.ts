import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { PAYMENT_PROVIDER } from '../interfaces/payment-provider.interface';
import type { PaymentProvider } from '../interfaces/payment-provider.interface';
import { payments } from '../../../shared/database/schema';
import type { Payment } from '../../../shared/database/schema';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async createPaymentRecord(
    orderId: string,
    amount: number,
    currency: string,
    orgId: string,
    storeId: string,
  ): Promise<Payment> {
    const { clientSecret, paymentIntentId } =
      await this.provider.createPaymentIntent(amount, currency, {
        organizationId: orgId,
        storeId,
        orderId,
      });

    const [payment] = await this.db
      .insert(payments)
      .values({
        organizationId: orgId,
        storeId,
        orderId,
        provider: 'stripe',
        status: 'pending',
        amount,
        currency,
        paymentIntentId,
        clientSecret,
      })
      .returning();

    return payment;
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.paymentIntentId, paymentIntentId))
      .limit(1);
    return row ?? null;
  }

  async findByOrderId(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, orderId),
          eq(payments.organizationId, orgId),
          eq(payments.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async markCaptured(paymentId: string, chargeId: string): Promise<Payment> {
    const [row] = await this.db
      .update(payments)
      .set({
        status: 'captured',
        chargeId,
        capturedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  async markFailed(paymentId: string, reason: string): Promise<Payment> {
    const [row] = await this.db
      .update(payments)
      .set({
        status: 'failed',
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    orgId: string,
    storeId: string,
    reason?: string,
  ): Promise<{ refundId: string; payment: Payment }> {
    const payment = await this.findByPaymentIntentId(paymentId);
    if (
      !payment ||
      payment.organizationId !== orgId ||
      payment.storeId !== storeId
    ) {
      throw new NotFoundException('Payment not found');
    }
    if (!payment.chargeId) {
      throw new NotFoundException(
        'No charge ID found — payment may not be captured',
      );
    }

    const { refundId } = await this.provider.refundPayment(
      payment.chargeId,
      amount,
      reason,
    );

    const isFullRefund = amount >= payment.amount;
    const [updated] = await this.db
      .update(payments)
      .set({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    return { refundId, payment: updated };
  }
}
