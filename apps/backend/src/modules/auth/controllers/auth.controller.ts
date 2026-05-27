import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantCreatedEvent } from '../../../shared/events/events';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly workosAuth: WorkosAuthService,
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

    return { message: 'Account created. Please check your email to verify.' };
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
}
