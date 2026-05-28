import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { RefundService } from './services/refund.service';
import { OrderResolver } from './resolvers/order.resolver';
import { AdminOrderController } from './controllers/admin-order.controller';

@Module({
  imports: [
    AuditModule,
    InventoryModule,
    AuthModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [AdminOrderController],
  providers: [OrderRepository, OrderService, RefundService, OrderResolver],
  exports: [OrderRepository, OrderService, RefundService],
})
export class OrderModule {}
