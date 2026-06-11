import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { CustomerService } from '../services/customer.service';
import { UpdateCustomerStatusDto } from '../dto/update-customer.dto';
import {
  CreateCustomerDto,
  AdminUpdateCustomerDto,
  ListCustomersQueryDto,
} from '../dto/admin-customer.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('Customers')
@Controller('admin/customers')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminCustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'List all customers' })
  @ApiResponse({ status: 200 })
  listCustomers(
    @Query() query: ListCustomersQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.customerService.listCustomers(tenant.organizationId, {
      status: query.status,
      groupId: query.groupId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Post()
  @RequirePermission('customers.create')
  @ApiOperation({
    summary: 'Create a customer (no password) and return a set-password link',
  })
  @ApiResponse({ status: 201 })
  createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.customerService.createCustomer(tenant.organizationId, dto);
  }

  @Get(':id')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200 })
  getCustomer(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.customerService.getProfile(id, tenant.organizationId);
  }

  @Patch(':id/status')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Update customer status' })
  @ApiResponse({ status: 200 })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.customerService.updateStatus(id, tenant.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Update customer details and group assignment' })
  @ApiResponse({ status: 200 })
  updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateCustomerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.customerService.updateCustomer(id, tenant.organizationId, dto);
  }

  @Post(':id/set-password-link')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: '(Re)issue a set-password link for a customer' })
  @ApiResponse({ status: 201 })
  generateSetPasswordLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.customerService.generateSetPasswordLink(
      id,
      tenant.organizationId,
    );
  }
}
