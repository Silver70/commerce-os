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
import {
  DashboardService,
  type StatsPeriod,
} from '../services/dashboard.service';

class StatsQueryDto {
  @IsEnum(['today', '7d', '30d', '90d'])
  declare period: StatsPeriod;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Get KPI metrics for the dashboard home',
    description:
      'Returns revenue, order count, AOV, conversion rate, and returning customer rate for the selected period, each with prior-period comparison and daily sparkline.',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', '7d', '30d', '90d'],
    required: true,
    description: 'Time period for stats aggregation',
  })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats(
    @Query() query: StatsQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.dashboardService.getStats(tenant.organizationId, query.period);
  }
}
