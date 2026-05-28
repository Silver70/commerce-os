import {
  Controller,
  Get,
  Post,
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
import { ApiKeyService } from '../../auth/services/api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/api-keys')
export class AdminApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @RequirePermission('api_keys.manage')
  @ApiOperation({ summary: 'List all API keys for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of API keys (hash never exposed)',
  })
  list(@CurrentTenant() tenant: TenantContext) {
    return this.apiKeyService.listByOrg(tenant.organizationId);
  }

  @Post()
  @RequirePermission('api_keys.manage')
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({
    status: 201,
    description:
      'Returns the created API key record. The raw key is returned once — store it securely.',
  })
  create(@Body() dto: CreateApiKeyDto, @CurrentTenant() tenant: TenantContext) {
    return this.apiKeyService.generate(
      tenant.organizationId,
      dto.name,
      tenant.userId,
    );
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
