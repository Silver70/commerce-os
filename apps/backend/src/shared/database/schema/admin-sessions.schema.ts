import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users.schema';

// One row per issued refresh token. Global (not tenant-scoped) — a session belongs
// to an admin user, not an org. Enables refresh-token rotation and logout/revoke:
// only the SHA-256 hash of the token is stored, never the raw value.
export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('admin_sessions_refresh_token_hash_idx').on(t.refreshTokenHash),
  ],
);

export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
