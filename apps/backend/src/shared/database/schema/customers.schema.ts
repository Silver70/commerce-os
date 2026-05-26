import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const customerStatusEnum = pgEnum('customer_status', [
  'active',
  'disabled',
]);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  status: customerStatusEnum('status').notNull().default('active'),
  emailVerified: boolean('email_verified').notNull().default(false),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
