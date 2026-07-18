import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { StorefrontAuthGuard } from '../../auth/guards/storefront-auth.guard';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import { EventIngestService } from '../services/event-ingest.service';
import { TrackEventsDto } from '../dto/track-events.dto';

/**
 * Public, headless event-ingestion API. Any storefront authenticates with its
 * `X-API-Key` (resolving org + store) and POSTs a batch of events. The caller
 * owns its own `sessionId` and attribution (referrer / UTM); we just store them.
 * Fire-and-forget from the client's perspective — returns 202 with a count.
 */
@ApiTags('Analytics Events')
@ApiSecurity('x-api-key')
@UseGuards(StorefrontAuthGuard)
@Controller('events')
export class StorefrontEventsController {
  constructor(private readonly ingest: EventIngestService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Ingest storefront analytics events',
    description:
      'Batch up to 50 events. Auth via X-API-Key. `type` and `sessionId` are required per event; product/variant ids, path, referrer, and utm_* are optional. Tenant is resolved from the API key, never the body.',
  })
  @ApiResponse({ status: 202, description: 'Events accepted' })
  async track(
    @Body() body: TrackEventsDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<{ accepted: number }> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const accepted = await this.ingest.ingest(
      organizationId,
      storeId,
      body.events,
    );
    return { accepted };
  }
}
