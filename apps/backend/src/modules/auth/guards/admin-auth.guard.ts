import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { organizations } from '../../../shared/database/schema';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly workosAuth: WorkosAuthService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (
      process.env.NODE_ENV !== 'production' &&
      this.config.get<string>('SKIP_AUTH') === 'true'
    ) {
      const devOrgId = this.config.get<string>('DEV_ORG_ID');
      const [org] = await this.db
        .select()
        .from(organizations)
        .where(
          devOrgId
            ? eq(organizations.workosOrgId, devOrgId)
            : eq(organizations.id, organizations.id),
        )
        .limit(1);

      if (!org) {
        throw new UnauthorizedException(
          'SKIP_AUTH is enabled but no organization exists in the database yet',
        );
      }

      request.tenantContext = {
        organizationId: org.id,
        userId: 'dev-user',
        email: 'dev@localhost',
        role: 'super_admin',
      };

      return true;
    }

    const token =
      (request.cookies as Record<string, string> | undefined)?.[
        'wos-session'
      ] ?? request.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    const session = await this.workosAuth.verifyToken(token);

    const workosOrgId = session.organizationId;
    if (!workosOrgId) {
      throw new UnauthorizedException(
        'No organization associated with session',
      );
    }

    let [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.workosOrgId, workosOrgId))
      .limit(1);

    if (!org) {
      const workosOrg = await this.workosAuth.getOrganization(workosOrgId);
      const slug = workosOrg.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      [org] = await this.db
        .insert(organizations)
        .values({ workosOrgId, name: workosOrg.name, slug })
        .returning();
    }

    const membership = await this.workosAuth.getOrganizationMembership(
      session.userId,
      workosOrgId,
    );

    const roleSlug = (membership?.role as { slug: string } | null | undefined)
      ?.slug;
    const role = roleSlug as TenantContext['role'];

    request.tenantContext = {
      organizationId: org.id,
      userId: session.userId,
      email: session.user?.email,
      role,
    };

    return true;
  }
}
