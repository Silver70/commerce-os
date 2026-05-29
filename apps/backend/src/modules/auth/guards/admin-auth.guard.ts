import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, asc } from 'drizzle-orm';
import type { Request } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { organizations, stores } from '../../../shared/database/schema';
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

      const requestedStoreId = this.extractStoreId(request);
      const activeStoreId = await this.resolveStoreId(org.id, requestedStoreId);

      request.tenantContext = {
        organizationId: org.id,
        storeId: activeStoreId,
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

    const requestedStoreId = this.extractStoreId(request);
    const activeStoreId = await this.resolveStoreId(org.id, requestedStoreId);

    request.tenantContext = {
      organizationId: org.id,
      storeId: activeStoreId,
      userId: session.userId,
      email: session.user?.email,
      role,
    };

    return true;
  }

  private extractStoreId(request: Request): string | undefined {
    const header = request.headers['x-store-id'];
    const headerVal = Array.isArray(header) ? header[0] : header;
    if (headerVal) return headerVal;
    const cookie = (request.cookies as Record<string, string> | undefined)?.[
      'wos-active-store'
    ];
    return cookie;
  }

  /**
   * Validates the requested store belongs to the org and is active.
   * Falls back to the first active store of the org so dev / fresh sessions work.
   * Returns `undefined` only when the org has no stores yet — org-level routes
   * still function in that case.
   */
  private async resolveStoreId(
    orgId: string,
    requestedStoreId: string | undefined,
  ): Promise<string | undefined> {
    if (requestedStoreId) {
      const [store] = await this.db
        .select()
        .from(stores)
        .where(
          and(
            eq(stores.id, requestedStoreId),
            eq(stores.organizationId, orgId),
          ),
        )
        .limit(1);

      if (!store) {
        throw new ForbiddenException('Store not found in this organization');
      }
      if (!store.isActive) {
        throw new ForbiddenException('Store is inactive');
      }
      return store.id;
    }

    const [fallback] = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.organizationId, orgId), eq(stores.isActive, true)))
      .orderBy(asc(stores.createdAt))
      .limit(1);

    return fallback?.id;
  }
}
