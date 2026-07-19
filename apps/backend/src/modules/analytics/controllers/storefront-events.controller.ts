import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { IngestAuthGuard } from '../../auth/guards/ingest-auth.guard';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import { EventIngestService } from '../services/event-ingest.service';
import { TrackEventsDto } from '../dto/track-events.dto';
import { resolveGeo } from '../utils/geo.util';

/**
 * Public, headless event-ingestion API. Any storefront authenticates with its
 * API key — as the `X-API-Key` header or a `?k=` query param (the latter for the
 * `sendBeacon` transport, which can't set headers) — and POSTs a batch of
 * events. The caller owns its `sessionId` / `visitorId` and attribution
 * (referrer / UTM); device + geo are enriched server-side from the request.
 * Fire-and-forget from the client's perspective — returns 202 with a count.
 */
@ApiTags('Analytics Events')
@ApiSecurity('x-api-key')
@UseGuards(IngestAuthGuard)
@Controller('events')
export class StorefrontEventsController {
  constructor(private readonly ingest: EventIngestService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Ingest storefront analytics events',
    description:
      'Batch up to 100 events. Auth via X-API-Key header or ?k= query param. `type` and `sessionId` are required per event; visitorId, eventName, product/variant ids, path, referrer, utm_*, and a free-form `properties` object are optional. Tenant is resolved from the API key, never the body; device + country are derived server-side.',
  })
  @ApiResponse({ status: 202, description: 'Events accepted' })
  async track(
    @Body() body: TrackEventsDto,
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request,
  ): Promise<{ accepted: number }> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const geo = resolveGeo(req.headers);
    const accepted = await this.ingest.ingest(
      organizationId,
      storeId,
      body.events,
      {
        userAgent: req.headers['user-agent'],
        countryCode: geo.countryCode,
        region: geo.region,
      },
    );
    return { accepted };
  }
}
