import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { CustomerService } from '../services/customer.service';
import { UpdateCustomerStatusDto } from '../dto/update-customer.dto';
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
  listCustomers(@CurrentTenant() tenant: TenantContext) {
    return this.customerService.listCustomers(tenant.organizationId);
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
}
