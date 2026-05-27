import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiscountRepository } from './repositories/discount.repository';
import { PricingEngineService } from './services/pricing-engine.service';
import {
  AdminDiscountController,
  AdminCouponController,
} from './controllers/admin-discount.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminDiscountController, AdminCouponController],
  providers: [DiscountRepository, PricingEngineService],
  exports: [PricingEngineService, DiscountRepository],
})
export class PricingModule {}
