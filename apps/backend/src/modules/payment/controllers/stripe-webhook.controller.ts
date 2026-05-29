import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import { PAYMENT_PROVIDER } from '../interfaces/payment-provider.interface';
import type {
  PaymentProvider,
  StripeWebhookEvent,
} from '../interfaces/payment-provider.interface';
import { PaymentService } from '../services/payment.service';
import {
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from '../../../shared/events/events';

interface StripePaymentIntentObject {
  id: string;
  latest_charge?: string | { id: string } | null;
  last_payment_error?: { message?: string } | null;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly paymentService: PaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    let event: StripeWebhookEvent;
    try {
      event = this.provider.verifyWebhookSignature(
        rawBody.toString('utf-8'),
        signature,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.handleEvent(event);
    return { received: true };
  }

  private async handleEvent(event: StripeWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data
          .object as unknown as StripePaymentIntentObject;
        await this.handlePaymentSucceeded(intent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data
          .object as unknown as StripePaymentIntentObject;
        await this.handlePaymentFailed(intent);
        break;
      }
    }
  }

  private async handlePaymentSucceeded(
    intent: StripePaymentIntentObject,
  ): Promise<void> {
    const payment = await this.paymentService.findByPaymentIntentId(intent.id);
    if (!payment) return;

    const latestCharge = intent.latest_charge;
    const chargeId =
      typeof latestCharge === 'string'
        ? latestCharge
        : (latestCharge?.id ?? '');

    await this.paymentService.markCaptured(payment.id, chargeId);

    await this.eventEmitter.emitAsync(
      'payment.succeeded',
      new PaymentSucceededEvent(
        payment.orderId,
        payment.organizationId,
        payment.storeId,
        intent.id,
        payment.amount,
      ),
    );
  }

  private async handlePaymentFailed(
    intent: StripePaymentIntentObject,
  ): Promise<void> {
    const payment = await this.paymentService.findByPaymentIntentId(intent.id);
    if (!payment) return;

    const reason = intent.last_payment_error?.message ?? 'Payment failed';

    await this.paymentService.markFailed(payment.id, reason);

    await this.eventEmitter.emitAsync(
      'payment.failed',
      new PaymentFailedEvent(
        payment.orderId,
        payment.organizationId,
        payment.storeId,
        intent.id,
        reason,
      ),
    );
  }
}
