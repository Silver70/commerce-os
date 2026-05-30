import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantCreatedEvent } from '../../../shared/events/events';
import { TenantService } from './tenant.service';
import { WorkosAuthService } from '../../auth/services/workos-auth.service';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly workosAuth: WorkosAuthService,
  ) {}

  @OnEvent('tenant.created')
  async handleTenantCreated(event: TenantCreatedEvent) {
    this.logger.log(
      `Provisioning tenant for user ${event.userId}: ${event.name}`,
    );

    try {
      const workosOrg = await this.workosAuth.createOrganization(event.name);

      await this.workosAuth.createMembership(
        event.userId,
        workosOrg.id,
        'super_admin',
      );

      const org = await this.tenantService.create({
        workosOrgId: workosOrg.id,
        name: event.name,
      });

      // No default store is created here. With multi-store support, the user
      // creates their first store during onboarding (and its storefront API
      // key) — see apps/frontend onboarding step1/step3. The login flow routes
      // users with zero stores into that onboarding flow.
      this.logger.log(`Tenant provisioned: orgId=${org.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to provision tenant for user ${event.userId}`,
        error,
      );
    }
  }
}
