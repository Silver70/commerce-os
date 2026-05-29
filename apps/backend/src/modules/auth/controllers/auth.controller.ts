import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
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
import type { Response } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import { ApiKeyService } from '../services/api-key.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantCreatedEvent } from '../../../shared/events/events';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create a new admin account and organization' })
  async signup(@Body() dto: SignupDto) {
    const user = await this.workosAuth.signup(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
    );

    this.eventEmitter.emit(
      'tenant.created',
      new TenantCreatedEvent('', user.id, dto.email, dto.organizationName),
    );

    return { userId: user.id, email: user.email };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.workosAuth.login(dto.email, dto.password);

    res.cookie('wos-session', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address with code from verification email',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.workosAuth.verifyEmail(dto.userId, dto.code);

    return { message: 'Email verified successfully.' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.workosAuth.resendVerificationEmail(dto.userId);
    return { message: 'Verification email sent.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and clear session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('wos-session');
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get current admin user' })
  async me(@CurrentTenant() tenant: TenantContext) {
    const memberships = await this.workosAuth.listOrganizations(tenant.userId!);
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
    return this.apiKeyService.generate(
      tenant.organizationId,
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
