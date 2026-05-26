import { Module } from '@nestjs/common';
import { WorkosAuthService } from './services/workos-auth.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { ApiKeyService } from './services/api-key.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { StorefrontAuthGuard } from './guards/storefront-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { SetRlsContextInterceptor } from './interceptors/set-rls-context.interceptor';
import { AuthController } from './controllers/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    WorkosAuthService,
    CustomerAuthService,
    ApiKeyService,
    AdminAuthGuard,
    StorefrontAuthGuard,
    RbacGuard,
    SetRlsContextInterceptor,
  ],
  exports: [
    WorkosAuthService,
    CustomerAuthService,
    ApiKeyService,
    AdminAuthGuard,
    StorefrontAuthGuard,
    RbacGuard,
    SetRlsContextInterceptor,
  ],
})
export class AuthModule {}
