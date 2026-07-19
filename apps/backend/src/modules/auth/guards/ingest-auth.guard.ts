import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';

/**
 * Auth for the headless event-ingest route only. Resolves the storefront's
 * `organization_id` + `store_id` from an API key supplied either as the
 * `X-API-Key` header OR a `?k=` query param.
 *
 * The query-param form exists because the browser `navigator.sendBeacon`
 * transport — the only reliable way to flush events on page unload — cannot set
 * custom request headers. Unlike {@link StorefrontAuthGuard} this guard is
 * HTTP-only and does not resolve an optional customer token (ingest is anonymous
 * by design).
 */
@Injectable()
export class IngestAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const headerVal = request.headers['x-api-key'];
    const queryVal = request.query?.['k'];
    const rawKey =
      (Array.isArray(headerVal) ? headerVal[0] : headerVal) ??
      (Array.isArray(queryVal) ? queryVal[0] : queryVal);

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException(
        'API key required (X-API-Key header or ?k=)',
      );
    }

    const { organizationId, storeId } = await this.apiKeyService.lookup(rawKey);
    request.tenantContext = { organizationId, storeId };
    return true;
  }
}
