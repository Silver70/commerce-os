import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq, and, asc } from 'drizzle-orm';
import type { Request } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { organizations, stores } from '../../../shared/database/schema';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly workosAuth: WorkosAuthService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {
    const clientId = config.getOrThrow<string>('WORKOS_CLIENT_ID');
    const jwksUrl = new URL(
      `https://api.workos.com/sso/jwks/${clientId}`,
    );
    this.jwks = createRemoteJWKSet(jwksUrl);
  }

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

    const authHeader = request.headers['authorization'];
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

    if (!token) {
      throw new UnauthorizedException('No Bearer token provided');
    }

    let payload: {
      sub: string;
      org_id?: string;
      role?: string;
      sid?: string;
      email?: string;
    };
    try {
      const { payload: verified } = await jwtVerify(token, this.jwks);
      payload = verified as typeof payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const workosOrgId = payload.org_id;

    // No org_id in token — bootstrap endpoint is the only caller here.
    // Set a minimal context so the controller can run provisioning logic.
    if (!workosOrgId) {
      request.tenantContext = {
        organizationId: '',
        userId: payload.sub,
        email: payload.email,
        role: undefined,
      };
      return true;
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

    const requestedStoreId = this.extractStoreId(request);
    const activeStoreId = await this.resolveStoreId(org.id, requestedStoreId);

    request.tenantContext = {
      organizationId: org.id,
      storeId: activeStoreId,
      userId: payload.sub,
      email: payload.email,
      role: payload.role as TenantContext['role'],
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
   * Resolves the active store for the request. The requested store id (from the
   * `X-Store-Id` header or `wos-active-store` cookie) is treated as a hint: if it
   * names a valid, active store in the org we honor it. Otherwise the hint is
   * stale — e.g. a cookie left over from a different org, or a store that was
   * since deleted/deactivated — and we fall back to the org's first active store
   * rather than failing the whole request. The org boundary is still enforced:
   * every query is scoped to `orgId`, so a foreign/forged id can never resolve to
   * another tenant's store. Returns `undefined` only when the org has no stores
   * yet — org-level routes still function in that case.
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
            eq(stores.isActive, true),
          ),
        )
        .limit(1);

      if (store) return store.id;
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
