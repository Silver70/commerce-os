import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkOS } from '@workos-inc/node';
import type { User } from '@workos-inc/node';

interface WorkOsJwtPayload {
  sub: string;
  exp?: number;
  org_id?: string;
  organizationId?: string;
}

export interface WorkOsLoginResult {
  user: User;
  accessToken: string;
}

@Injectable()
export class WorkosAuthService {
  private readonly workos: InstanceType<typeof WorkOS>;

  constructor(private readonly config: ConfigService) {
    this.workos = new WorkOS(config.getOrThrow<string>('WORKOS_API_KEY'));
  }

  async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    return this.workos.userManagement.createUser({
      email,
      password,
      firstName,
      lastName,
      emailVerified: false,
    });
  }

  async login(
    email: string,
    password: string,
    clientId?: string,
  ): Promise<WorkOsLoginResult> {
    const clientIdResolved =
      clientId ?? this.config.getOrThrow<string>('WORKOS_CLIENT_ID');
    const result = await this.workos.userManagement.authenticateWithPassword({
      email,
      password,
      clientId: clientIdResolved,
    });
    return result;
  }

  async verifyToken(token: string) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ) as WorkOsJwtPayload;
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new UnauthorizedException('Token expired');
      }
      const user = await this.workos.userManagement.getUser(payload.sub);
      return {
        user,
        userId: user.id,
        organizationId: payload.org_id ?? payload.organizationId ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired session token');
    }
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

  async listOrganizations(userId: string) {
    const memberships =
      await this.workos.userManagement.listOrganizationMemberships({ userId });
    return memberships.data;
  }
}
