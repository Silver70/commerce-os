import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
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
import { OrderService } from '../services/order.service';
import { RefundService } from '../services/refund.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { AddNoteDto } from '../dto/add-note.dto';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { OrderFilterDto } from '../dto/order-filter.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly refundService: RefundService,
  ) {}

  @Get()
  @RequirePermission('orders.read')
  @ApiOperation({
    summary: 'List orders with optional filters and cursor pagination',
  })
  @ApiResponse({ status: 200 })
  async list(
    @Query() filters: OrderFilterDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.orderService.listOrders(filters, tenant.organizationId);
  }

  @Post()
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Create a manual order (admin-only)' })
  @ApiResponse({ status: 201 })
  async createManual(
    @Body() dto: CreateOrderDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const adminName = tenant.email ?? tenant.userId ?? 'Admin';
    const adminId = tenant.userId ?? 'system';
    return this.orderService.createManualOrder(
      dto,
      adminName,
      adminId,
      tenant.organizationId,
    );
  }

  @Get(':id')
  @RequirePermission('orders.read')
  @ApiOperation({
    summary:
      'Get full order detail including timeline, line items, and payment',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getDetail(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.orderService.getDetail(id, tenant.organizationId);
  }

  @Patch(':id/status')
  @RequirePermission('orders.update')
  @ApiOperation({
    summary: 'Transition order to a new status via the state machine',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404 })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const adminId = tenant.userId ?? 'system';
    return this.orderService.transition(
      id,
      dto.status,
      tenant.organizationId,
      'admin',
      adminId,
    );
  }

  @Post(':id/notes')
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Add a note to the order timeline' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404 })
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const adminId = tenant.userId ?? 'system';
    await this.orderService.addNote(
      id,
      tenant.organizationId,
      dto.note,
      adminId,
    );
    return { success: true };
  }

  @Post(':id/refund')
  @RequirePermission('orders.refund')
  @ApiOperation({ summary: 'Initiate a full or partial refund for an order' })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 400,
    description: 'Invalid refund amount or order state',
  })
  @ApiResponse({ status: 404 })
  async refund(
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const adminId = tenant.userId ?? 'system';
    return this.refundService.initiateRefund(
      id,
      dto.amount,
      dto.reason,
      adminId,
      tenant.organizationId,
    );
  }

  @Post(':id/shipment')
  @RequirePermission('orders.update')
  @ApiOperation({
    summary: 'Create a shipment record and mark the order as shipped',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 400,
    description: 'Order is not in a shippable state',
  })
  @ApiResponse({ status: 404 })
  async createShipment(
    @Param('id') id: string,
    @Body() dto: CreateShipmentDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const adminId = tenant.userId ?? 'system';
    return this.orderService.createShipment(
      id,
      dto,
      adminId,
      tenant.organizationId,
    );
  }
}
