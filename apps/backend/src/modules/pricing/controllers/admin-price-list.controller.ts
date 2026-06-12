import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import { PriceListRepository } from '../repositories/price-list.repository';
import { CustomerRepository } from '../../customer/repositories/customer.repository';
import { CustomerGroupRepository } from '../../customer/repositories/customer-group.repository';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  SetPriceListPricesDto,
  CreateAssignmentDto,
} from '../dto/price-list.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import type {
  PriceList,
  PriceListPrice,
  PriceListAssignment,
} from '../../../shared/database/schema';

@ApiTags('Price Lists')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/price-lists')
export class AdminPriceListController {
  constructor(
    private readonly priceListRepo: PriceListRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly groupRepo: CustomerGroupRepository,
  ) {}

  // ─── Lists ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('price_lists.read')
  @ApiOperation({ summary: 'List all price lists for the active store' })
  @ApiResponse({ status: 200 })
  async list(@CurrentTenant() tenant: TenantContext): Promise<PriceList[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.priceListRepo.findManyLists(organizationId, storeId);
  }

  @Post()
  @RequirePermission('price_lists.write')
  @ApiOperation({ summary: 'Create a price list' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreatePriceListDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceList> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    this.assertAdjustment(dto.type, dto.adjustmentBasisPoints);
    return this.priceListRepo.createList({
      organizationId,
      storeId,
      name: dto.name,
      type: dto.type,
      adjustmentBasisPoints:
        dto.type === 'adjustment' ? (dto.adjustmentBasisPoints ?? null) : null,
      priority: dto.priority ?? 100,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });
  }

  @Get(':id')
  @RequirePermission('price_lists.read')
  @ApiOperation({ summary: 'Get a price list with its prices and assignments' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<
    PriceList & {
      prices: PriceListPrice[];
      assignments: PriceListAssignment[];
    }
  > {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const list = await this.priceListRepo.findListById(
      id,
      organizationId,
      storeId,
    );
    if (!list) throw new NotFoundException('Price list not found');
    const [prices, assignments] = await Promise.all([
      this.priceListRepo.findPrices(id, organizationId),
      this.priceListRepo.findAssignments(id, organizationId),
    ]);
    return { ...list, prices, assignments };
  }

  @Patch(':id')
  @RequirePermission('price_lists.write')
  @ApiOperation({ summary: 'Update a price list' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceListDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceList> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.priceListRepo.findListById(
      id,
      organizationId,
      storeId,
    );
    if (!existing) throw new NotFoundException('Price list not found');

    const nextType = dto.type ?? existing.type;
    const nextBps =
      dto.adjustmentBasisPoints !== undefined
        ? dto.adjustmentBasisPoints
        : existing.adjustmentBasisPoints;
    this.assertAdjustment(nextType, nextBps ?? undefined);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.startsAt !== undefined)
      patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined)
      patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    // Keep adjustmentBasisPoints consistent with the (possibly changed) type
    if (nextType === 'adjustment') {
      patch.adjustmentBasisPoints = nextBps ?? null;
    } else {
      patch.adjustmentBasisPoints = null;
    }

    const updated = await this.priceListRepo.updateList(
      id,
      organizationId,
      storeId,
      patch,
    );
    if (!updated) throw new NotFoundException('Price list not found');
    return updated;
  }

  @Delete(':id')
  @RequirePermission('price_lists.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a price list (cascades prices + assignments)',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.priceListRepo.findListById(
      id,
      organizationId,
      storeId,
    );
    if (!existing) throw new NotFoundException('Price list not found');
    await this.priceListRepo.deleteList(id, organizationId, storeId);
  }

  // ─── Fixed prices ────────────────────────────────────────────────────────────

  @Get(':id/prices')
  @RequirePermission('price_lists.read')
  @ApiOperation({
    summary: 'List the per-variant prices of a fixed price list',
  })
  @ApiResponse({ status: 200 })
  async listPrices(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceListPrice[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    await this.requireList(id, organizationId, storeId);
    return this.priceListRepo.findPrices(id, organizationId);
  }

  @Put(':id/prices')
  @RequirePermission('price_lists.write')
  @ApiOperation({ summary: 'Bulk upsert per-variant prices on a fixed list' })
  @ApiResponse({ status: 200 })
  async setPrices(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPriceListPricesDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceListPrice[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const list = await this.requireList(id, organizationId, storeId);
    if (list.type !== 'fixed') {
      throw new BadRequestException(
        'Prices can only be set on fixed price lists',
      );
    }
    const variantIds = dto.prices.map((p) => p.variantId);
    const owned = await this.priceListRepo.filterOwnedVariantIds(
      organizationId,
      storeId,
      variantIds,
    );
    const ownedSet = new Set(owned);
    const unknown = variantIds.filter((v) => !ownedSet.has(v));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown or cross-store variants: ${unknown.join(', ')}`,
      );
    }
    await this.priceListRepo.setPrices(id, organizationId, dto.prices);
    return this.priceListRepo.findPrices(id, organizationId);
  }

  @Delete(':id/prices/:variantId')
  @RequirePermission('price_lists.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a variant price from a fixed list' })
  @ApiResponse({ status: 204 })
  async deletePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    await this.requireList(id, organizationId, storeId);
    await this.priceListRepo.deletePrice(id, variantId, organizationId);
  }

  // ─── Lookups (lists applicable to a customer / group) ────────────────────────

  @Get('assigned-to/customer/:customerId')
  @RequirePermission('price_lists.read')
  @ApiOperation({ summary: 'List price lists assigned to a customer' })
  @ApiResponse({ status: 200 })
  async listsForCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceList[]> {
    const { organizationId } = requireStoreContext(tenant);
    return this.priceListRepo.findListsAssignedToCustomer(
      customerId,
      organizationId,
    );
  }

  @Get('assigned-to/group/:groupId')
  @RequirePermission('price_lists.read')
  @ApiOperation({ summary: 'List price lists assigned to a group' })
  @ApiResponse({ status: 200 })
  async listsForGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceList[]> {
    const { organizationId } = requireStoreContext(tenant);
    return this.priceListRepo.findListsAssignedToGroup(groupId, organizationId);
  }

  // ─── Assignments ─────────────────────────────────────────────────────────────

  @Get(':id/assignments')
  @RequirePermission('price_lists.read')
  @ApiOperation({ summary: 'List the assignments of a price list' })
  @ApiResponse({ status: 200 })
  async listAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceListAssignment[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    await this.requireList(id, organizationId, storeId);
    return this.priceListRepo.findAssignments(id, organizationId);
  }

  @Post(':id/assignments')
  @RequirePermission('price_lists.write')
  @ApiOperation({ summary: 'Attach a price list to a customer or group' })
  @ApiResponse({ status: 201 })
  async createAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<PriceListAssignment> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    await this.requireList(id, organizationId, storeId);

    const hasCustomer = !!dto.customerId;
    const hasGroup = !!dto.groupId;
    if (hasCustomer === hasGroup) {
      throw new BadRequestException(
        'Provide exactly one of customerId or groupId',
      );
    }

    if (dto.customerId) {
      const customer = await this.customerRepo.findById(
        dto.customerId,
        organizationId,
      );
      if (!customer) throw new NotFoundException('Customer not found');
    }
    if (dto.groupId) {
      const group = await this.groupRepo.findById(dto.groupId, organizationId);
      if (!group) throw new NotFoundException('Customer group not found');
    }

    return this.priceListRepo.createAssignment({
      organizationId,
      priceListId: id,
      customerId: dto.customerId ?? null,
      groupId: dto.groupId ?? null,
    });
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermission('price_lists.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a price list assignment' })
  @ApiResponse({ status: 204 })
  async deleteAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    await this.requireList(id, organizationId, storeId);
    await this.priceListRepo.deleteAssignment(assignmentId, organizationId);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private assertAdjustment(
    type: 'fixed' | 'adjustment',
    bps: number | undefined,
  ): void {
    if (type === 'adjustment' && (bps === undefined || bps === null)) {
      throw new BadRequestException(
        'adjustmentBasisPoints is required for adjustment price lists',
      );
    }
  }

  private async requireList(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<PriceList> {
    const list = await this.priceListRepo.findListById(id, orgId, storeId);
    if (!list) throw new NotFoundException('Price list not found');
    return list;
  }
}
