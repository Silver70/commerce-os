import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { ShippingService } from '../services/shipping.service';
import {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from '../dto/create-shipping-zone.dto';
import {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
} from '../dto/create-shipping-method.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';

@ApiTags('Shipping')
@Controller('admin/shipping')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ─── Zones ────────────────────────────────────────────────────────────────────

  @Get('zones')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'List shipping zones' })
  @ApiResponse({ status: 200 })
  listZones(@CurrentTenant() tenant: TenantContext) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.listZones(organizationId, storeId);
  }

  @Post('zones')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Create a shipping zone' })
  @ApiResponse({ status: 201 })
  createZone(
    @Body() dto: CreateShippingZoneDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.createZone(dto, organizationId, storeId);
  }

  @Patch('zones/:id')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Update a shipping zone' })
  @ApiResponse({ status: 200 })
  updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateShippingZoneDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.updateZone(id, dto, organizationId, storeId);
  }

  @Delete('zones/:id')
  @RequirePermission('settings.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shipping zone' })
  @ApiResponse({ status: 204 })
  deleteZone(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.deleteZone(id, organizationId, storeId);
  }

  // ─── Methods ──────────────────────────────────────────────────────────────────

  @Get('methods')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'List shipping methods' })
  @ApiResponse({ status: 200 })
  listMethods(
    @CurrentTenant() tenant: TenantContext,
    @Query('zoneId') zoneId?: string,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.listMethods(organizationId, storeId, zoneId);
  }

  @Post('methods')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Create a shipping method' })
  @ApiResponse({ status: 201 })
  createMethod(
    @Body() dto: CreateShippingMethodDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.createMethod(dto, organizationId, storeId);
  }

  @Patch('methods/:id')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Update a shipping method' })
  @ApiResponse({ status: 200 })
  updateMethod(
    @Param('id') id: string,
    @Body() dto: UpdateShippingMethodDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.updateMethod(id, dto, organizationId, storeId);
  }

  @Delete('methods/:id')
  @RequirePermission('settings.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shipping method' })
  @ApiResponse({ status: 204 })
  deleteMethod(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.shippingService.deleteMethod(id, organizationId, storeId);
  }
}
