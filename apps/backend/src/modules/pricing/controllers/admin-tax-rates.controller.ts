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
  NotFoundException,
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
import { TaxRateService } from '../services/tax-rate.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from '../dto/create-tax-rate.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('Tax Rates')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/tax-rates')
export class AdminTaxRatesController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @Get()
  @RequirePermission('tax.read')
  @ApiOperation({ summary: 'List all tax rates for the organization' })
  @ApiResponse({ status: 200 })
  list(@CurrentTenant() tenant: TenantContext) {
    return this.taxRateService.list(tenant.organizationId);
  }

  @Post()
  @RequirePermission('tax.write')
  @ApiOperation({ summary: 'Create a tax rate' })
  @ApiResponse({ status: 201 })
  create(
    @Body() dto: CreateTaxRateDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxRateService.create(tenant.organizationId, dto);
  }

  @Get(':id')
  @RequirePermission('tax.read')
  @ApiOperation({ summary: 'Get a tax rate by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const record = await this.taxRateService.findById(
      id,
      tenant.organizationId,
    );
    if (!record) {
      throw new NotFoundException('Tax rate not found');
    }
    return record;
  }

  @Patch(':id')
  @RequirePermission('tax.write')
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRateDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxRateService.update(id, tenant.organizationId, dto);
  }

  @Delete(':id')
  @RequirePermission('tax.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tax rate' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxRateService.remove(id, tenant.organizationId);
  }
}
