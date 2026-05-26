import { eq, and, SQL, InferSelectModel } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { DrizzleClient } from '../database/database.module';
import type { TenantContext } from './tenant-context';

// Structural constraint — every tenant-scoped table must have these two columns.
type TenantTable = PgTable & {
  id: PgColumn;
  organizationId: PgColumn;
};

export abstract class TenantScopedRepository<TTable extends TenantTable> {
  constructor(
    protected readonly db: DrizzleClient,
    protected readonly table: TTable,
    protected readonly ctx: TenantContext,
  ) {}

  protected get orgFilter(): SQL {
    return eq(this.table.organizationId, this.ctx.organizationId);
  }

  async findMany(filters?: SQL): Promise<InferSelectModel<TTable>[]> {
    const conditions: SQL[] = [this.orgFilter];
    if (filters) conditions.push(filters);
    // Drizzle's .from() has a conditional generic (TableLikeHasEmptySelection)
    // that can't be resolved when TTable is still generic — cast required here.

    const rows = await this.db
      .select()
      .from(this.table as any)
      .where(and(...conditions));
    return rows as InferSelectModel<TTable>[];
  }

  async findById(id: string): Promise<InferSelectModel<TTable> | null> {
    const rows = await this.db
      .select()
      .from(this.table as any)
      .where(and(eq(this.table.id, id), this.orgFilter))
      .limit(1);
    return (rows[0] as InferSelectModel<TTable>) ?? null;
  }

  async create(
    data: Record<string, unknown>,
  ): Promise<InferSelectModel<TTable>> {
    // .insert().values() requires concrete column types — cast required here.

    const [row] = (await this.db
      .insert(this.table as any)
      .values({ ...data, organizationId: this.ctx.organizationId })
      .returning()) as unknown as InferSelectModel<TTable>[];
    return row;
  }

  async update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<InferSelectModel<TTable> | null> {
    const patch =
      'updatedAt' in this.table ? { ...data, updatedAt: new Date() } : data;
    // .update().set() requires concrete column types — cast required here.

    const rows = await this.db
      .update(this.table as any)
      .set(patch)
      .where(and(eq(this.table.id, id), this.orgFilter))
      .returning();
    return (rows[0] as InferSelectModel<TTable>) ?? null;
  }

  async softDelete(id: string): Promise<InferSelectModel<TTable> | null> {
    if (!('deletedAt' in this.table)) {
      throw new Error(`Table does not support soft delete`);
    }
    const rows = await this.db
      .update(this.table as any)
      .set({ deletedAt: new Date() })
      .where(and(eq(this.table.id, id), this.orgFilter))
      .returning();
    return (rows[0] as InferSelectModel<TTable>) ?? null;
  }

  async hardDelete(id: string): Promise<void> {
    // .delete() accepts PgTable directly — no cast needed.
    await this.db
      .delete(this.table)
      .where(and(eq(this.table.id, id), this.orgFilter));
  }
}
