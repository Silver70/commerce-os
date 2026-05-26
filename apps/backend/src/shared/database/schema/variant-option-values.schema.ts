import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { productVariants } from './product-variants.schema';
import { productOptionValues } from './product-option-values.schema';

export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    optionValueId: uuid('option_value_id')
      .notNull()
      .references(() => productOptionValues.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.variantId, t.optionValueId] })],
);

export type VariantOptionValue = typeof variantOptionValues.$inferSelect;
