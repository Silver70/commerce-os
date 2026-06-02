import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkOS } from '@workos-inc/node';
import type { User } from '@workos-inc/node';

@Injectable()
export class WorkosAuthService {
  private readonly logger = new Logger(WorkosAuthService.name);
  readonly workos: InstanceType<typeof WorkOS>;

  constructor(private readonly config: ConfigService) {
    this.workos = new WorkOS(config.getOrThrow<string>('WORKOS_API_KEY'));
  }

  async getOrganizationMembership(userId: string, organizationId: string) {
    const memberships =
      await this.workos.userManagement.listOrganizationMemberships({
        userId,
        organizationId,
      });
    return memberships.data[0] ?? null;
  }

  async createOrganization(name: string) {
    return this.workos.organizations.createOrganization({ name });
  }

  async createMembership(userId: string, orgId: string, roleSlug: string) {
    return this.workos.userManagement.createOrganizationMembership({
      userId,
      organizationId: orgId,
      roleSlug,
    });
  }

  async listOrganizationMemberships(userId: string) {
    const memberships =
      await this.workos.userManagement.listOrganizationMemberships({ userId });
    return memberships.data;
  }

  async getOrganization(orgId: string) {
    return this.workos.organizations.getOrganization(orgId);
  }

  async getUser(userId: string): Promise<User> {
    return this.workos.userManagement.getUser(userId);
  }

  getJwksUrl(): string {
    const clientId = this.config.getOrThrow<string>('WORKOS_CLIENT_ID');
    return `https://api.workos.com/sso/jwks/${clientId}`;
  }
}
