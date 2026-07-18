import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { analyticsEvents } from '../../../shared/database/schema';
import type { NewAnalyticsEvent } from '../../../shared/database/schema';
import type { TrackEventDto } from '../dto/track-events.dto';

@Injectable()
export class EventIngestService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  /**
   * Batch-inserts storefront events for a tenant. `organizationId` / `storeId`
   * come from the API key (never trusted from the request body). Returns the
   * number of rows written.
   */
  async ingest(
    organizationId: string,
    storeId: string,
    events: TrackEventDto[],
  ): Promise<number> {
    if (events.length === 0) return 0;

    const rows: NewAnalyticsEvent[] = events.map((e) => ({
      organizationId,
      storeId,
      sessionId: e.sessionId,
      eventType: e.type,
      productId: e.productId ?? null,
      variantId: e.variantId ?? null,
      path: e.path ?? null,
      referrer: e.referrer ?? null,
      utmSource: e.utmSource ?? null,
      utmMedium: e.utmMedium ?? null,
      utmCampaign: e.utmCampaign ?? null,
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
    }));

    await this.db.insert(analyticsEvents).values(rows);
    return rows.length;
  }
}
