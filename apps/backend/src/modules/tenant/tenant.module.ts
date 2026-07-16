import { Module } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { StoreService } from './services/store.service';
import { AdminOrganizationController } from './controllers/admin-organization.controller';
import { AdminApiKeysController } from './controllers/admin-api-keys.controller';
import { AdminStoreController } from './controllers/admin-store.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminOrganizationController,
    AdminApiKeysController,
    AdminStoreController,
  ],
  providers: [TenantService, StoreService],
  exports: [TenantService, StoreService],
})
export class TenantModule {}
