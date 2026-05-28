import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShippingService } from './services/shipping.service';
import { ShippingResolver } from './resolvers/shipping.resolver';
import { AdminShippingController } from './controllers/admin-shipping.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminShippingController],
  providers: [ShippingService, ShippingResolver],
  exports: [ShippingService],
})
export class ShippingModule {}
