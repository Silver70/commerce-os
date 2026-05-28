import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerService } from './services/customer.service';
import { CustomerResolver } from './resolvers/customer.resolver';
import { AdminCustomerController } from './controllers/admin-customer.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminCustomerController],
  providers: [CustomerRepository, CustomerService, CustomerResolver],
  exports: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
