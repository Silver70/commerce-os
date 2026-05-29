import { Inject, Injectable } from '@nestjs/common';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { categories } from '../../../shared/database/schema';
import type { Category, NewCategory } from '../../../shared/database/schema';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoryRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findById(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findBySlug(
    slug: string,
    orgId: string,
    storeId: string,
  ): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
          eq(categories.slug, slug),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async slugExists(
    slug: string,
    orgId: string,
    storeId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
          eq(categories.slug, slug),
        ),
      )
      .limit(1);
    return !!row;
  }

  async getTree(orgId: string, storeId: string): Promise<CategoryTreeNode[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
        ),
      )
      .orderBy(categories.position);

    return buildTree(rows);
  }

  async getRootCategories(orgId: string, storeId: string): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
          isNull(categories.parentId),
        ),
      )
      .orderBy(categories.position);
  }

  async getAncestors(
    categoryId: string,
    orgId: string,
    storeId: string,
  ): Promise<Category[]> {
    const result = await this.db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT * FROM categories
          WHERE id = ${categoryId}
            AND organization_id = ${orgId}
            AND store_id = ${storeId}
        UNION ALL
        SELECT c.* FROM categories c
        INNER JOIN ancestors a ON c.id = a.parent_id
        WHERE c.organization_id = ${orgId}
          AND c.store_id = ${storeId}
      )
      SELECT * FROM ancestors ORDER BY created_at ASC
    `);

    return result.rows as unknown as Category[];
  }

  async create(data: NewCategory): Promise<Category> {
    const [row] = await this.db.insert(categories).values(data).returning();
    return row;
  }

  async update(
    id: string,
    orgId: string,
    storeId: string,
    data: Partial<NewCategory>,
  ): Promise<Category | null> {
    const [row] = await this.db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async delete(id: string, orgId: string, storeId: string): Promise<void> {
    await this.db
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, orgId),
          eq(categories.storeId, storeId),
        ),
      );
  }
}

function buildTree(flat: Category[]): CategoryTreeNode[] {
  const nodeMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of flat) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }

  for (const node of nodeMap.values()) {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
