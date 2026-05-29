import {
  Controller,
  Get,
  Delete,
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
import { ApiKeyService } from '../../auth/services/api-key.service';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/api-keys')
export class AdminApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @RequirePermission('api_keys.manage')
  @ApiOperation({
    summary: 'List all API keys across stores in the organization',
  })
  @ApiResponse({
    status: 200,
    description:
      'Org-wide rollup. Use POST /admin/stores/:id/api-keys to create.',
  })
  list(@CurrentTenant() tenant: TenantContext) {
    return this.apiKeyService.listByOrg(tenant.organizationId);
  }

  @Delete(':id')
  @RequirePermission('api_keys.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.apiKeyService.revoke(id, tenant.organizationId);
  }
}
