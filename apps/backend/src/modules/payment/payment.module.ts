import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';
import { PAYMENT_PROVIDER } from './interfaces/payment-provider.interface';
import { StripeAdapter } from './services/stripe.adapter';
import { PaymentService } from './services/payment.service';
import { PaymentEventHandler } from './services/payment-event.handler';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';

@Module({
  imports: [OrderModule, InventoryModule, AuditModule],
  controllers: [StripeWebhookController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useClass: StripeAdapter,
    },
    PaymentService,
    PaymentEventHandler,
  ],
  exports: [PaymentService, PAYMENT_PROVIDER],
})
export class PaymentModule {}
