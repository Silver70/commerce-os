import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { products } from './products.schema';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    costPrice: integer('cost_price'),
    weight: integer('weight'),
    weightUnit: varchar('weight_unit', { length: 10 }).default('g'),
    requiresShipping: boolean('requires_shipping').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('variants_org_sku_unique').on(t.organizationId, t.sku)],
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
