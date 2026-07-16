import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, asc } from 'drizzle-orm';
import type { Request } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { organizations, stores } from '../../../shared/database/schema';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (
      process.env.NODE_ENV !== 'production' &&
      this.config.get<string>('SKIP_AUTH') === 'true'
    ) {
      // DEV_ORG_ID is a local organization UUID; without it we fall back to
      // whichever org comes first (fine for a single-tenant dev database).
      const devOrgId = this.config.get<string>('DEV_ORG_ID');
      const [org] = await this.db
        .select()
        .from(organizations)
        .where(
          devOrgId
            ? eq(organizations.id, devOrgId)
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

    const claims = this.adminAuth.verifyAccess(token);

    if (!claims.org_id) {
      throw new UnauthorizedException('Token is missing organization context');
    }

    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, claims.org_id))
      .limit(1);

    if (!org) {
      throw new UnauthorizedException('Organization not found');
    }

    const requestedStoreId = this.extractStoreId(request);
    const activeStoreId = await this.resolveStoreId(org.id, requestedStoreId);

    request.tenantContext = {
      organizationId: org.id,
      storeId: activeStoreId,
      userId: claims.sub,
      email: claims.email,
      role: claims.role,
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
