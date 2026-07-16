import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

// Admin users are GLOBAL identities (no organization_id): a single user can belong
// to multiple organizations via organization_members. This mirrors the WorkOS user
// model we are replacing, and keeps multi-org / team management possible later.
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // nullable: invite-created accounts (future team management) have no password
  // until set via a token link. Self-serve registrations always set one.
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 255 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
