import { pgTable, uuid, timestamp, unique, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { adminUsers } from './admin-users.schema';

// The three admin roles enforced by RbacGuard / permissions.ts. Stored as an
// enum for DB-level validation, matching the customerStatusEnum convention.
export const adminRoleEnum = pgEnum('admin_role', [
  'super_admin',
  'product_manager',
  'support_agent',
]);

// Join between an admin user and an organization, carrying their role in that org.
// Tenant-scoped: organization_id is the second column per the multi-tenancy rule.
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    role: adminRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('organization_members_org_user_unique').on(
      t.organizationId,
      t.adminUserId,
    ),
  ],
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
