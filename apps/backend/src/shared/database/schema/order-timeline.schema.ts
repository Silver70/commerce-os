import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { stores } from './stores.schema';
import { orders } from './orders.schema';

export const timelineEventTypeEnum = pgEnum('timeline_event_type', [
  'status_changed',
  'note_added',
  'payment_received',
  'refund_issued',
  'shipment_created',
  'manually_created',
]);

export const orderTimeline = pgTable('order_timeline', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  eventType: timelineEventTypeEnum('event_type').notNull(),
  message: text('message').notNull(),
  actorType: varchar('actor_type', { length: 50 }),
  actorId: varchar('actor_id', { length: 255 }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type OrderTimeline = typeof orderTimeline.$inferSelect;
export type NewOrderTimeline = typeof orderTimeline.$inferInsert;
