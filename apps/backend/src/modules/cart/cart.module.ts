import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';
import { CartRepository } from './repositories/cart.repository';
import { CartService } from './services/cart.service';
import { CartResolver } from './resolvers/cart.resolver';

@Module({
  imports: [AuthModule, PricingModule],
  providers: [CartRepository, CartService, CartResolver],
  exports: [CartService, CartRepository],
})
export class CartModule {}
