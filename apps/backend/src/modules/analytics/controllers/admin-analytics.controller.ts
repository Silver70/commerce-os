import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import {
  AnalyticsService,
  type AnalyticsPeriod,
} from '../services/analytics.service';

class PeriodQueryDto {
  @IsEnum(['today', '7d', '30d', '90d'])
  declare period: AnalyticsPeriod;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('sales')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Sales analytics',
    description:
      'Top products, sales by category, gross margin/profit, and coupon effectiveness for the period.',
  })
  @ApiQuery({ name: 'period', enum: ['today', '7d', '30d', '90d'] })
  @ApiResponse({ status: 200, description: 'Sales analytics' })
  async getSales(
    @Query() query: PeriodQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.analytics.getSales(organizationId, storeId, query.period);
  }

  @Get('orders')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Order analytics',
    description:
      'Order status breakdown, cart abandonment, refund rate, and payment success/failure for the period.',
  })
  @ApiQuery({ name: 'period', enum: ['today', '7d', '30d', '90d'] })
  @ApiResponse({ status: 200, description: 'Order analytics' })
  async getOrders(
    @Query() query: PeriodQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.analytics.getOrders(organizationId, storeId, query.period);
  }

  @Get('customers')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Customer analytics',
    description:
      'Total/new customers, new-customer growth over time, and new-vs-returning order split for the period.',
  })
  @ApiQuery({ name: 'period', enum: ['today', '7d', '30d', '90d'] })
  @ApiResponse({ status: 200, description: 'Customer analytics' })
  async getCustomers(
    @Query() query: PeriodQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.analytics.getCustomers(organizationId, storeId, query.period);
  }

  @Get('inventory')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Inventory analytics',
    description:
      'Low-stock / out-of-stock counts, stock-on-hand units, stock value at cost, and the lowest-stock items. Not period-scoped (point-in-time).',
  })
  @ApiResponse({ status: 200, description: 'Inventory analytics' })
  async getInventory(@CurrentTenant() tenant: TenantContext) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.analytics.getInventory(organizationId, storeId);
  }

  @Get('traffic')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Traffic & funnel analytics',
    description:
      'Unique visitors, traffic-source breakdown (first-touch channel), conversion funnel (visitors → product view → add to cart → checkout → purchase), and true conversion rate (orders ÷ visitors). Powered by the analytics_events ingest API.',
  })
  @ApiQuery({ name: 'period', enum: ['today', '7d', '30d', '90d'] })
  @ApiResponse({ status: 200, description: 'Traffic analytics' })
  async getTraffic(
    @Query() query: PeriodQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.analytics.getTraffic(organizationId, storeId, query.period);
  }
}
