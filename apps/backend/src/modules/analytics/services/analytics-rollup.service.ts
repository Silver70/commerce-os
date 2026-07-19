import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { sql, type SQL } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';

/**
 * Nightly maintenance for the analytics event pipeline (Phase 3 slice D):
 *
 *  1. Rollup  — aggregates each complete UTC day of raw `analytics_events` into
 *     the permanent `analytics_daily_metrics` summary table (idempotent upsert,
 *     bots excluded). Summaries outlive raw retention, so long-range trends
 *     survive the purge and per-day reads stay cheap as raw volume grows.
 *  2. Retention — deletes raw events older than ANALYTICS_RETENTION_DAYS. Runs
 *     after the rollup so nothing is purged before it's been summarized.
 *
 * Partitioning of `analytics_events` is intentionally deferred (see the plan):
 * converting a live table to partitioned is a heavy migration, and retention
 * keeps the table bounded, so it isn't justified at current volume.
 */
@Injectable()
export class AnalyticsRollupService {
  private readonly logger = new Logger(AnalyticsRollupService.name);
  private readonly retentionDays: number;

  // Dimensions rolled up per day: [metric, keyExpr, extraFilter?].
  private readonly dimensions: [string, SQL, SQL?][] = [
    ['summary', sql`''`],
    ['device', sql`COALESCE(device_type, 'unknown')`],
    ['browser', sql`browser`, sql`browser IS NOT NULL`],
    ['os', sql`os`, sql`os IS NOT NULL`],
    ['country', sql`country_code`, sql`country_code IS NOT NULL`],
    ['page', sql`path`, sql`event_type = 'page_view' AND path IS NOT NULL`],
  ];

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    config: ConfigService,
  ) {
    this.retentionDays = Number(
      config.get<number>('ANALYTICS_RETENTION_DAYS', 90),
    );
  }

  @Cron('15 1 * * *') // 01:15 daily
  async rollupPendingDays(): Promise<number> {
    const days = await this.pendingDays();
    for (const day of days) {
      for (const [metric, keyExpr, extra] of this.dimensions) {
        await this.rollupDimension(day, metric, keyExpr, extra);
      }
      await this.rollupChannel(day);
    }
    if (days.length) {
      this.logger.log(
        `Rolled up ${days.length} day(s): ${days[0]}…${days[days.length - 1]}`,
      );
    }
    return days.length;
  }

  @Cron('45 2 * * *') // 02:45 daily, after the rollup
  async purgeExpiredRawEvents(): Promise<number> {
    if (!this.retentionDays || this.retentionDays <= 0) return 0; // disabled
    const res = await this.db.execute(sql`
      DELETE FROM analytics_events
      WHERE occurred_at < date_trunc('day', now()) - make_interval(days => ${this.retentionDays})
    `);
    const deleted = res.rowCount ?? 0;
    if (deleted > 0) {
      this.logger.log(
        `Purged ${deleted} raw event(s) older than ${this.retentionDays}d`,
      );
    }
    return deleted;
  }

  // Complete UTC days (never today) that are unrolled, plus the last two
  // complete days re-rolled to absorb late-arriving events. Capped for safety.
  private async pendingDays(): Promise<string[]> {
    const res = await this.db.execute(sql`
      SELECT DISTINCT occurred_at::date AS day
      FROM analytics_events e
      WHERE occurred_at < date_trunc('day', now())
        AND (
          occurred_at::date > (now()::date - 3)
          OR NOT EXISTS (
            SELECT 1 FROM analytics_daily_metrics m
            WHERE m.day = e.occurred_at::date
          )
        )
      ORDER BY day
      LIMIT 90
    `);
    return (res.rows as { day: string | Date }[]).map((r) =>
      typeof r.day === 'string'
        ? r.day
        : new Date(r.day).toISOString().slice(0, 10),
    );
  }

  private async rollupDimension(
    day: string,
    metric: string,
    keyExpr: SQL,
    extra?: SQL,
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO analytics_daily_metrics
        (organization_id, store_id, day, metric, key, sessions, events)
      SELECT
        organization_id, store_id, ${day}::date, ${metric}, ${keyExpr},
        COUNT(DISTINCT session_id)::int, COUNT(*)::int
      FROM analytics_events
      WHERE occurred_at >= ${day}::date
        AND occurred_at < (${day}::date + INTERVAL '1 day')
        AND (device_type IS NULL OR device_type <> 'bot')
        ${extra ? sql`AND ${extra}` : sql``}
      GROUP BY 1, 2, 5
      ON CONFLICT (organization_id, store_id, day, metric, key)
      DO UPDATE SET sessions = EXCLUDED.sessions, events = EXCLUDED.events
    `);
  }

  // Channel is session-level (first-touch), so it needs a per-session CTE before
  // grouping. Mirrors the derivation in AnalyticsService.trafficSources.
  private async rollupChannel(day: string): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO analytics_daily_metrics
        (organization_id, store_id, day, metric, key, sessions, events)
      WITH first_touch AS (
        SELECT DISTINCT ON (organization_id, store_id, session_id)
          organization_id, store_id, session_id, referrer, utm_source, utm_medium
        FROM analytics_events
        WHERE occurred_at >= ${day}::date
          AND occurred_at < (${day}::date + INTERVAL '1 day')
          AND (device_type IS NULL OR device_type <> 'bot')
        ORDER BY organization_id, store_id, session_id, occurred_at ASC
      )
      SELECT
        organization_id, store_id, ${day}::date, 'channel',
        CASE
          WHEN lower(coalesce(utm_medium, '')) IN ('cpc','ppc','paid','paid_social','paidsearch') THEN 'Paid'
          WHEN referrer ~* '(chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|claude\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|you\\.com|poe\\.com)'
            OR lower(coalesce(utm_source, '')) ~ '(chatgpt|openai|perplexity|gemini|copilot|claude)' THEN 'AI Assistant'
          WHEN coalesce(utm_source, '') <> '' THEN 'Campaign'
          WHEN coalesce(referrer, '') = '' THEN 'Direct'
          WHEN referrer ~* '(google|bing|yahoo|duckduckgo|ecosia|baidu|yandex)\\.' THEN 'Organic Search'
          WHEN referrer ~* '(facebook|instagram|twitter|t\\.co|x\\.com|tiktok|linkedin|pinterest|youtube|reddit|snapchat)\\.' THEN 'Social'
          ELSE 'Referral'
        END,
        COUNT(*)::int, COUNT(*)::int
      FROM first_touch
      GROUP BY 1, 2, 5
      ON CONFLICT (organization_id, store_id, day, metric, key)
      DO UPDATE SET sessions = EXCLUDED.sessions, events = EXCLUDED.events
    `);
  }
}
