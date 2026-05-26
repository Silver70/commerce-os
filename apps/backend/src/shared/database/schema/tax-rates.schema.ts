import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  stateCode: varchar('state_code', { length: 10 }),
  rate: integer('rate').notNull().default(0),
  isInclusive: boolean('is_inclusive').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;
