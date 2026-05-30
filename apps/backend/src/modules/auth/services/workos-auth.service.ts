import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
  refreshToken: string;
}

@Injectable()
export class WorkosAuthService {
  private readonly logger = new Logger(WorkosAuthService.name);
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
    let user;
    try {
      user = await this.workos.userManagement.createUser({
        email,
        password,
        firstName,
        lastName,
        emailVerified: false,
      });
    } catch (err) {
      this.logger.error('WorkOS createUser failed', err);
      throw err;
    }

    try {
      await this.workos.userManagement.sendVerificationEmail({
        userId: user.id,
      });
    } catch (err) {
      this.logger.error('sendVerificationEmail failed after createUser', err);
    }

    return user;
  }

  async login(email: string, password: string): Promise<WorkOsLoginResult> {
    const result = await this.workos.userManagement.authenticateWithPassword({
      email,
      password,
      clientId: this.config.getOrThrow<string>('WORKOS_CLIENT_ID'),
    });
    return result;
  }

  async refreshSession(refreshToken: string): Promise<WorkOsLoginResult> {
    const result =
      await this.workos.userManagement.authenticateWithRefreshToken({
        refreshToken,
        clientId: this.config.getOrThrow<string>('WORKOS_CLIENT_ID'),
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

      // authenticateWithPassword without an organizationId arg issues a token
      // with no org_id claim. Fall back to the user's first active membership.
      let organizationId: string | null =
        payload.org_id ?? payload.organizationId ?? null;
      if (!organizationId) {
        const memberships =
          await this.workos.userManagement.listOrganizationMemberships({
            userId: payload.sub,
          });
        organizationId = memberships.data[0]?.organizationId ?? null;
      }

      return { user, userId: user.id, organizationId };
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

  async verifyEmail(userId: string, code: string): Promise<void> {
    await this.workos.userManagement.verifyEmail({ userId, code });
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    await this.workos.userManagement.sendVerificationEmail({ userId });
  }

  async listOrganizations(userId: string) {
    const memberships =
      await this.workos.userManagement.listOrganizationMemberships({ userId });
    return memberships.data;
  }

  async getOrganization(orgId: string) {
    return this.workos.organizations.getOrganization(orgId);
  }
}
