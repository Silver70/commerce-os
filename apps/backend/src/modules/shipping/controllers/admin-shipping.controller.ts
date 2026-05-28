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
    return this.shippingService.listZones(tenant.organizationId);
  }

  @Post('zones')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Create a shipping zone' })
  @ApiResponse({ status: 201 })
  createZone(
    @Body() dto: CreateShippingZoneDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.shippingService.createZone(dto, tenant.organizationId);
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
    return this.shippingService.updateZone(id, dto, tenant.organizationId);
  }

  @Delete('zones/:id')
  @RequirePermission('settings.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shipping zone' })
  @ApiResponse({ status: 204 })
  deleteZone(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.shippingService.deleteZone(id, tenant.organizationId);
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
    return this.shippingService.listMethods(tenant.organizationId, zoneId);
  }

  @Post('methods')
  @RequirePermission('settings.write')
  @ApiOperation({ summary: 'Create a shipping method' })
  @ApiResponse({ status: 201 })
  createMethod(
    @Body() dto: CreateShippingMethodDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.shippingService.createMethod(dto, tenant.organizationId);
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
    return this.shippingService.updateMethod(id, dto, tenant.organizationId);
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
    return this.shippingService.deleteMethod(id, tenant.organizationId);
  }
}
