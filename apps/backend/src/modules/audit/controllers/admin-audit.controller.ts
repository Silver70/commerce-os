import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { AuditService } from '../services/audit.service';

class AuditLogQueryDto {
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) offset?: number;
}

@ApiTags('admin/audit')
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  @ApiOperation({ summary: 'Get audit logs with optional filters' })
  async getAuditLogs(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.query({
      organizationId: tenant.organizationId,
      entityType: query.entityType,
      actorId: query.actorId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
