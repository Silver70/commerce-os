import { Module } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { AdminOrganizationController } from './controllers/admin-organization.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminOrganizationController],
  providers: [TenantService, TenantProvisioningService],
  exports: [TenantService],
})
export class TenantModule {}
