import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerGroupRepository } from './repositories/customer-group.repository';
import { CustomerService } from './services/customer.service';
import { CustomerGroupService } from './services/customer-group.service';
import { CustomerResolver } from './resolvers/customer.resolver';
import { AdminCustomerController } from './controllers/admin-customer.controller';
import { AdminCustomerGroupController } from './controllers/admin-customer-group.controller';
import { CustomerController } from './controllers/customer.controller';

@Module({
  imports: [AuthModule, OrderModule],
  controllers: [
    AdminCustomerController,
    AdminCustomerGroupController,
    CustomerController,
  ],
  providers: [
    CustomerRepository,
    CustomerGroupRepository,
    CustomerService,
    CustomerGroupService,
    CustomerResolver,
  ],
  exports: [
    CustomerService,
    CustomerRepository,
    CustomerGroupRepository,
    CustomerGroupService,
  ],
})
export class CustomerModule {}
