import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { DiscountRepository } from './repositories/discount.repository';
import { PriceListRepository } from './repositories/price-list.repository';
import { PricingEngineService } from './services/pricing-engine.service';
import { PriceResolverService } from './services/price-resolver.service';
import { TaxRateService } from './services/tax-rate.service';
import {
  AdminDiscountController,
  AdminCouponController,
} from './controllers/admin-discount.controller';
import { AdminTaxRatesController } from './controllers/admin-tax-rates.controller';
import { AdminPriceListController } from './controllers/admin-price-list.controller';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [
    AdminDiscountController,
    AdminCouponController,
    AdminTaxRatesController,
    AdminPriceListController,
  ],
  providers: [
    DiscountRepository,
    PriceListRepository,
    PricingEngineService,
    PriceResolverService,
    TaxRateService,
  ],
  exports: [
    PricingEngineService,
    PriceResolverService,
    DiscountRepository,
    PriceListRepository,
    TaxRateService,
  ],
})
export class PricingModule {}
