import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';

@Module({
  imports: [AuditModule],
  providers: [OrderRepository, OrderService],
  exports: [OrderRepository, OrderService],
})
export class OrderModule {}
