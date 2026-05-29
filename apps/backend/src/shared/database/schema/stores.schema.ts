import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('stores_org_slug_unique').on(t.organizationId, t.slug)],
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
