import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { productVariants } from './product-variants.schema';

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id')
    .notNull()
    .unique()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  allowBackorder: boolean('allow_backorder').notNull().default(false),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
