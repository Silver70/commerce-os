import { pgTable, uuid, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { priceLists } from './price-lists.schema';
import { customers } from './customers.schema';
import { customerGroups } from './customer-groups.schema';

// Binds a price list to a customer or a group. Exactly one of customerId /
// groupId is set (enforced in the service layer).
export const priceListAssignments = pgTable(
  'price_list_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'cascade',
    }),
    groupId: uuid('group_id').references(() => customerGroups.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    // Postgres treats NULLs as distinct, so a list may have one row per
    // customer and one per group without these constraints colliding.
    unique('price_list_assignments_list_customer_unique').on(
      t.priceListId,
      t.customerId,
    ),
    unique('price_list_assignments_list_group_unique').on(
      t.priceListId,
      t.groupId,
    ),
    index('price_list_assignments_customer_idx').on(t.customerId),
    index('price_list_assignments_group_idx').on(t.groupId),
  ],
);

export type PriceListAssignment = typeof priceListAssignments.$inferSelect;
export type NewPriceListAssignment = typeof priceListAssignments.$inferInsert;
