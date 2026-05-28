export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface RefundResult {
  refundId: string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface PaymentProvider {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ): Promise<CreatePaymentIntentResult>;

  capturePayment(paymentIntentId: string): Promise<void>;

  refundPayment(
    chargeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult>;

  verifyWebhookSignature(
    payload: string,
    signature: string,
  ): StripeWebhookEvent;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
