import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantService } from '../services/tenant.service';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@ApiTags('admin/organization')
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/organization')
export class AdminOrganizationController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get current organization settings' })
  async getOrganization(@CurrentTenant() tenant: TenantContext) {
    return this.tenantService.findById(tenant.organizationId);
  }

  @Patch()
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateOrganization(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.tenantService.update(tenant.organizationId, dto);
  }
}
