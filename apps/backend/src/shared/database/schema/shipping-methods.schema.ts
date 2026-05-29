import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { stores } from './stores.schema';
import { shippingZones } from './shipping-zones.schema';

export const shippingRateTypeEnum = pgEnum('shipping_rate_type', [
  'flat_rate',
  'free',
  'calculated',
]);

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  zoneId: uuid('zone_id')
    .notNull()
    .references(() => shippingZones.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  rateType: shippingRateTypeEnum('rate_type').notNull().default('flat_rate'),
  price: integer('price').notNull().default(0),
  minOrderAmount: integer('min_order_amount'),
  estimatedDaysMin: integer('estimated_days_min'),
  estimatedDaysMax: integer('estimated_days_max'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type NewShippingMethod = typeof shippingMethods.$inferInsert;
