import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StorefrontAuthGuard } from '../../auth/guards/storefront-auth.guard';
import { ShippingService } from '../services/shipping.service';
import { ShippingRateType } from '../models/shipping.model';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { Request } from 'express';

interface GqlContext {
  req: Request & { tenantContext?: TenantContext };
}

@Resolver()
@UseGuards(StorefrontAuthGuard)
export class ShippingResolver {
  constructor(private readonly shippingService: ShippingService) {}

  @Query(() => [ShippingRateType], {
    description:
      'Get available shipping rates for an address and cart subtotal',
  })
  async shippingRates(
    @Context() ctx: GqlContext,
    @Args('countryCode') countryCode: string,
    @Args('orderSubtotal', { description: 'Cart subtotal in cents' })
    orderSubtotal: number,
  ): Promise<ShippingRateType[]> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    return this.shippingService.getShippingRates(
      countryCode,
      orderSubtotal,
      tenant.organizationId,
    );
  }
}
