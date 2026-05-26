import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { customers } from './customers.schema';

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  company: varchar('company', { length: 255 }),
  line1: varchar('line1', { length: 255 }).notNull(),
  line2: varchar('line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
