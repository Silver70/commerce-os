import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkosAuthService } from '../services/workos-auth.service';
import { ApiKeyService } from '../services/api-key.service';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';

class CreateApiKeyDto {
  @ApiProperty({ description: 'Display name for this API key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly workosAuth: WorkosAuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // ─── Bootstrap (first-login org provisioning) ─────────────────────────────

  @Post('bootstrap')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Idempotently provision a WorkOS org + membership for a brand-new user',
  })
  async bootstrap(@CurrentTenant() tenant: TenantContext) {
    const userId = tenant.userId!;

    // Idempotent: return existing org if user already has a membership
    const memberships =
      await this.workosAuth.listOrganizationMemberships(userId);
    if (memberships.length > 0) {
      return { workosOrgId: memberships[0].organizationId };
    }

    const user = await this.workosAuth.getUser(userId);
    const orgName = user.email.split('@')[0] ?? 'My Organization';

    const workosOrg = await this.workosAuth.createOrganization(orgName);
    await this.workosAuth.createMembership(userId, workosOrg.id, 'super_admin');

    // The DB organizations row is auto-created by AdminAuthGuard on the next
    // authenticated request once the JWT carries the new org_id claim.
    return { workosOrgId: workosOrg.id };
  }

  // ─── Me ───────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get current admin user info' })
  async me(@CurrentTenant() tenant: TenantContext) {
    const memberships = await this.workosAuth.listOrganizationMemberships(
      tenant.userId!,
    );
    return {
      userId: tenant.userId,
      email: tenant.email,
      organizationId: tenant.organizationId,
      role: tenant.role,
      memberships,
    };
  }

  // ─── API Key management ────────────────────────────────────────────────────

  @Get('admin/api-keys')
  @UseGuards(AdminAuthGuard, RbacGuard)
  @RequirePermission('settings.write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys for the organization' })
  @ApiResponse({ status: 200 })
  async listApiKeys(@CurrentTenant() tenant: TenantContext) {
    return this.apiKeyService.listByOrg(tenant.organizationId);
  }

  @Post('admin/api-keys')
  @UseGuards(AdminAuthGuard, RbacGuard)
  @RequirePermission('settings.write')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Generate a new API key — raw key is returned once and never stored',
  })
  @ApiResponse({ status: 201 })
  async generateApiKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.apiKeyService.generate(
      organizationId,
      storeId,
      dto.name,
      tenant.userId,
    );
  }

  @Delete('admin/api-keys/:id')
  @UseGuards(AdminAuthGuard, RbacGuard)
  @RequirePermission('settings.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204 })
  async revokeApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    await this.apiKeyService.revoke(id, tenant.organizationId);
  }
}
