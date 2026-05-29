import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { InventoryService } from '../services/inventory.service';
import { AdjustInventoryDto } from '../dto/adjust-inventory.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';

class InitInventoryDto {
  @ApiPropertyOptional({ description: 'Initial stock quantity (default 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare initialQuantity?: number;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'List all inventory items for the active store' })
  @ApiResponse({ status: 200 })
  async listAll(@CurrentTenant() tenant: TenantContext) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.inventoryService.getAllForOrg(organizationId, storeId);
  }

  @Get('low-stock')
  @RequirePermission('inventory.update')
  @ApiOperation({
    summary: 'List inventory items at or below the low-stock threshold',
  })
  async getLowStock(@CurrentTenant() tenant: TenantContext) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.inventoryService.getLowStockItems(organizationId, storeId);
  }

  @Post(':variantId')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Initialize inventory tracking for a variant' })
  async init(
    @Param('variantId') variantId: string,
    @Body() dto: InitInventoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.inventoryService.createForVariant(
      variantId,
      organizationId,
      storeId,
      dto.initialQuantity ?? 0,
    );
  }

  @Get(':variantId')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Get inventory item for a specific variant' })
  async getByVariant(
    @Param('variantId') variantId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.inventoryService.getByVariantId(
      variantId,
      organizationId,
      storeId,
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
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.inventoryService.adjust(
      variantId,
      dto.adjustment,
      dto.reason,
      tenant.userId ?? 'system',
      organizationId,
      storeId,
    );
  }
}
