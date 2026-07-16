import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  // nullable: legacy orgs provisioned through WorkOS carry this id; self-serve
  // orgs created by our own auth do not. The local `id` is the source of truth.
  workosOrgId: varchar('workos_org_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
