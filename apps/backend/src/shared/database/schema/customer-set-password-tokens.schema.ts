import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { customers } from './customers.schema';

export const customerSetPasswordTokens = pgTable(
  'customer_set_password_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    // store SHA-256/bcrypt of the token, never the raw token
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('customer_set_password_tokens_token_hash_idx').on(t.tokenHash)],
);

export type CustomerSetPasswordToken =
  typeof customerSetPasswordTokens.$inferSelect;
export type NewCustomerSetPasswordToken =
  typeof customerSetPasswordTokens.$inferInsert;
