import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { InventoryService } from '../services/inventory.service';
import { AdjustInventoryDto } from '../dto/adjust-inventory.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'List all inventory items for the organization' })
  @ApiResponse({ status: 200 })
  async listAll(@CurrentTenant() tenant: TenantContext) {
    return this.inventoryService.getAllForOrg(tenant.organizationId);
  }

  @Get('low-stock')
  @RequirePermission('inventory.update')
  @ApiOperation({
    summary: 'List inventory items at or below the low-stock threshold',
  })
  async getLowStock(@CurrentTenant() tenant: TenantContext) {
    return this.inventoryService.getLowStockItems(tenant.organizationId);
  }

  @Get(':variantId')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Get inventory item for a specific variant' })
  async getByVariant(
    @Param('variantId') variantId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.getByVariantId(
      variantId,
      tenant.organizationId,
    );
  }

  @Patch(':variantId')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Adjust stock quantity for a variant' })
  async adjust(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.adjust(
      variantId,
      dto.adjustment,
      dto.reason,
      tenant.userId ?? 'system',
      tenant.organizationId,
    );
  }
}
