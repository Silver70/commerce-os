import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeLib from 'stripe';
import type {
  PaymentProvider,
  CreatePaymentIntentResult,
  RefundResult,
  StripeWebhookEvent,
} from '../interfaces/payment-provider.interface';

type StripeInstance = InstanceType<typeof StripeLib>;

@Injectable()
export class StripeAdapter implements PaymentProvider {
  private readonly stripe: StripeInstance;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.stripe = new StripeLib(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
    this.webhookSecret = config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ): Promise<CreatePaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata,
      capture_method: 'automatic',
    });

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
    };
  }

  async capturePayment(paymentIntentId: string): Promise<void> {
    await this.stripe.paymentIntents.capture(paymentIntentId);
  }

  async refundPayment(
    chargeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
    const refund = await this.stripe.refunds.create({
      charge: chargeId,
      amount,
      ...(reason &&
        validReasons.includes(reason) && {
          reason: reason as
            | 'duplicate'
            | 'fraudulent'
            | 'requested_by_customer',
        }),
    });
    return { refundId: refund.id };
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
  ): StripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
    return event as unknown as StripeWebhookEvent;
  }
}
