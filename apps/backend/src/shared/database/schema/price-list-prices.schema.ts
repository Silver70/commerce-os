import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { priceLists } from './price-lists.schema';
import { productVariants } from './product-variants.schema';

// Explicit per-variant prices — only used by price lists of type = 'fixed'.
export const priceListPrices = pgTable(
  'price_list_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    price: integer('price').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // v1: one price per variant. Future tiers would add min_quantity + drop this.
    unique('price_list_prices_list_variant_unique').on(
      t.priceListId,
      t.variantId,
    ),
  ],
);

export type PriceListPrice = typeof priceListPrices.$inferSelect;
export type NewPriceListPrice = typeof priceListPrices.$inferInsert;
