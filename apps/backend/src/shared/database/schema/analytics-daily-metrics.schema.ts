import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { stores } from './stores.schema';

// Permanent daily rollup of analytics_events. Raw events are purged after the
// retention window (ANALYTICS_RETENTION_DAYS, default 90d); these summaries live
// forever, so long-range trends survive the purge and per-day reads stay cheap
// as raw volume grows.
//
// EAV-ish shape: one row per (organization_id, store_id, day, metric, key).
//   metric ∈ summary | device | browser | os | country | channel | page
//   key    = the dimension value (device type, channel, country, path, …);
//            '' for the scalar `summary` metric.
//   sessions = COUNT(DISTINCT session_id); events = raw row count (views/hits).
// Populated nightly by AnalyticsRollupService via an idempotent upsert on the
// unique index, so re-running a day is safe. Bots are excluded at rollup time.
export const analyticsDailyMetrics = pgTable(
  'analytics_daily_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    metric: varchar('metric', { length: 32 }).notNull(),
    key: varchar('key', { length: 512 }).notNull(),
    sessions: integer('sessions').notNull().default(0),
    events: integer('events').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('analytics_daily_metrics_unique_idx').on(
      t.organizationId,
      t.storeId,
      t.day,
      t.metric,
      t.key,
    ),
    index('analytics_daily_metrics_lookup_idx').on(
      t.organizationId,
      t.storeId,
      t.metric,
      t.day,
    ),
  ],
);

export type AnalyticsDailyMetric = typeof analyticsDailyMetrics.$inferSelect;
export type NewAnalyticsDailyMetric = typeof analyticsDailyMetrics.$inferInsert;
