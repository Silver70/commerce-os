import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantCreatedEvent } from '../../../shared/events/events';
import { TenantService } from './tenant.service';
import { StoreService } from './store.service';
import { WorkosAuthService } from '../../auth/services/workos-auth.service';
import { ApiKeyService } from '../../auth/services/api-key.service';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly storeService: StoreService,
    private readonly workosAuth: WorkosAuthService,
    private readonly apiKeyService: ApiKeyService,
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

      const store = await this.storeService.create(org.id, {
        name: 'Default Store',
      });

      const { rawKey } = await this.apiKeyService.generate(
        org.id,
        store.id,
        'Default API Key',
        event.userId,
      );

      this.logger.log(
        `Tenant provisioned: orgId=${org.id} storeId=${store.id} — save this API key: ${rawKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to provision tenant for user ${event.userId}`,
        error,
      );
    }
  }
}
