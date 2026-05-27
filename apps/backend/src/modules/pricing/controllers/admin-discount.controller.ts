import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { DiscountRepository } from '../repositories/discount.repository';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
} from '../dto/create-discount.dto';
import { CreateCouponDto, UpdateCouponDto } from '../dto/create-coupon.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { Discount, Coupon } from '../../../shared/database/schema';

// ─── Discounts ────────────────────────────────────────────────────────────────

@ApiTags('Discounts')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/discounts')
export class AdminDiscountController {
  constructor(private readonly discountRepo: DiscountRepository) {}

  @Get()
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'List all discounts for the organization' })
  @ApiResponse({ status: 200 })
  async list(@CurrentTenant() tenant: TenantContext): Promise<Discount[]> {
    return this.discountRepo.findManyDiscounts(tenant.organizationId);
  }

  @Post()
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Create a discount' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateDiscountDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Discount> {
    return this.discountRepo.createDiscount({
      organizationId: tenant.organizationId,
      name: dto.name,
      type: dto.type,
      value: dto.value,
      scope: dto.scope,
      scopeId: dto.scopeId ?? null,
      minOrderAmount: dto.minOrderAmount ?? null,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });
  }

  @Get(':id')
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Get a discount by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Discount> {
    const discount = await this.discountRepo.findDiscountById(
      id,
      tenant.organizationId,
    );
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  @Patch(':id')
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Update a discount' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Discount> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.value !== undefined) patch.value = dto.value;
    if (dto.scope !== undefined) patch.scope = dto.scope;
    if (dto.scopeId !== undefined) patch.scopeId = dto.scopeId;
    if (dto.minOrderAmount !== undefined)
      patch.minOrderAmount = dto.minOrderAmount;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.startsAt !== undefined)
      patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined)
      patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    const updated = await this.discountRepo.updateDiscount(
      id,
      tenant.organizationId,
      patch,
    );
    if (!updated) throw new NotFoundException('Discount not found');
    return updated;
  }

  @Delete(':id')
  @RequirePermission('discounts.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a discount' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    const existing = await this.discountRepo.findDiscountById(
      id,
      tenant.organizationId,
    );
    if (!existing) throw new NotFoundException('Discount not found');
    await this.discountRepo.deleteDiscount(id, tenant.organizationId);
  }
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly discountRepo: DiscountRepository) {}

  @Get()
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'List all coupons for the organization' })
  @ApiResponse({ status: 200 })
  async list(@CurrentTenant() tenant: TenantContext): Promise<Coupon[]> {
    return this.discountRepo.findManyCoupons(tenant.organizationId);
  }

  @Post()
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateCouponDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Coupon> {
    return this.discountRepo.createCoupon({
      organizationId: tenant.organizationId,
      code: dto.code,
      type: dto.type,
      value: dto.value ?? 0,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxUsageCount: dto.maxUsageCount ?? null,
      maxUsagePerCustomer: dto.maxUsagePerCustomer ?? null,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });
  }

  @Get(':id')
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Coupon> {
    const coupon = await this.discountRepo.findCouponById(
      id,
      tenant.organizationId,
    );
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  @Patch(':id')
  @RequirePermission('discounts.write')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<Coupon> {
    const patch: Record<string, unknown> = {};
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.value !== undefined) patch.value = dto.value;
    if (dto.minOrderAmount !== undefined)
      patch.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUsageCount !== undefined)
      patch.maxUsageCount = dto.maxUsageCount;
    if (dto.maxUsagePerCustomer !== undefined)
      patch.maxUsagePerCustomer = dto.maxUsagePerCustomer;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.startsAt !== undefined)
      patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined)
      patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    const updated = await this.discountRepo.updateCoupon(
      id,
      tenant.organizationId,
      patch,
    );
    if (!updated) throw new NotFoundException('Coupon not found');
    return updated;
  }

  @Delete(':id')
  @RequirePermission('discounts.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    const existing = await this.discountRepo.findCouponById(
      id,
      tenant.organizationId,
    );
    if (!existing) throw new NotFoundException('Coupon not found');
    await this.discountRepo.deleteCoupon(id, tenant.organizationId);
  }
}
