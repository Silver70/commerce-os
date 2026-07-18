import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { stores } from './stores.schema';

export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'purchase',
]);

// Append-only storefront event log powering traffic-source, funnel, and
// true-conversion analytics. Headless: any frontend POSTs events to the ingest
// API with its own `session_id` + attribution — this table just stores them.
// `product_id` / `variant_id` are intentionally NOT foreign keys so an event
// survives the product being deleted and never fails to insert on an unknown id.
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    // Caller-supplied visitor/session identifier — the unit of "unique visitor"
    // and the grouping key for the funnel. Opaque to us.
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    eventType: analyticsEventTypeEnum('event_type').notNull(),
    productId: uuid('product_id'),
    variantId: uuid('variant_id'),
    path: varchar('path', { length: 1024 }),
    referrer: varchar('referrer', { length: 1024 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    // When the event happened on the client (caller-supplied); defaults to
    // ingest time. Kept separate from created_at (server insert time).
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('analytics_events_org_store_time_idx').on(
      t.organizationId,
      t.storeId,
      t.occurredAt,
    ),
    index('analytics_events_org_store_session_idx').on(
      t.organizationId,
      t.storeId,
      t.sessionId,
    ),
    index('analytics_events_org_store_type_time_idx').on(
      t.organizationId,
      t.storeId,
      t.eventType,
      t.occurredAt,
    ),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
