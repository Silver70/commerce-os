import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const customerGroups = pgTable(
  'customer_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('customer_groups_org_name_unique').on(t.organizationId, t.name),
  ],
);

export type CustomerGroup = typeof customerGroups.$inferSelect;
export type NewCustomerGroup = typeof customerGroups.$inferInsert;
