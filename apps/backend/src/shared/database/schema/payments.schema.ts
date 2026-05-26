import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { orders } from './orders.schema';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',
  'manual',
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  provider: paymentProviderEnum('provider').notNull().default('stripe'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  paymentIntentId: varchar('payment_intent_id', { length: 255 }),
  chargeId: varchar('charge_id', { length: 255 }),
  clientSecret: varchar('client_secret', { length: 500 }),
  failureReason: varchar('failure_reason', { length: 500 }),
  capturedAt: timestamp('captured_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
