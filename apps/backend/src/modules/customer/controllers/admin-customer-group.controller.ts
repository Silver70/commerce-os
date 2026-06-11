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
import { CustomerGroupService } from '../services/customer-group.service';
import {
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
} from '../dto/customer-group.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { CustomerGroup } from '../../../shared/database/schema';

@ApiTags('Customer Groups')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/customer-groups')
export class AdminCustomerGroupController {
  constructor(private readonly groupService: CustomerGroupService) {}

  @Get()
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'List all customer groups' })
  @ApiResponse({ status: 200 })
  list(@CurrentTenant() tenant: TenantContext): Promise<CustomerGroup[]> {
    return this.groupService.list(tenant.organizationId);
  }

  @Post()
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Create a customer group' })
  @ApiResponse({ status: 201 })
  create(
    @Body() dto: CreateCustomerGroupDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<CustomerGroup> {
    return this.groupService.create(dto, tenant.organizationId);
  }

  @Get(':id')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Get a customer group by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<CustomerGroup> {
    return this.groupService.getById(id, tenant.organizationId);
  }

  @Patch(':id')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Update a customer group' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerGroupDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<CustomerGroup> {
    return this.groupService.update(id, dto, tenant.organizationId);
  }

  @Delete(':id')
  @RequirePermission('customers.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer group' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    return this.groupService.delete(id, tenant.organizationId);
  }
}
