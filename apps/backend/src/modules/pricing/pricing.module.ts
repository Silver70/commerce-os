import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiscountRepository } from './repositories/discount.repository';
import { PricingEngineService } from './services/pricing-engine.service';
import { TaxRateService } from './services/tax-rate.service';
import {
  AdminDiscountController,
  AdminCouponController,
} from './controllers/admin-discount.controller';
import { AdminTaxRatesController } from './controllers/admin-tax-rates.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminDiscountController,
    AdminCouponController,
    AdminTaxRatesController,
  ],
  providers: [DiscountRepository, PricingEngineService, TaxRateService],
  exports: [PricingEngineService, DiscountRepository, TaxRateService],
})
export class PricingModule {}
