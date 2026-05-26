import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
]);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    status: productStatusEnum('status').notNull().default('draft'),
    vendor: varchar('vendor', { length: 255 }),
    tags: text('tags').array(),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('products_org_slug_unique').on(t.organizationId, t.slug)],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
