import { eq, and, SQL, InferSelectModel } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { DrizzleClient } from '../database/database.module';
import type { TenantContext } from './tenant-context';

// Structural constraint — every tenant-scoped table must have these two columns.
// Tables that are also store-scoped additionally expose a `storeId` column.
type TenantTable = PgTable & {
  id: PgColumn;
  organizationId: PgColumn;
  storeId?: PgColumn;
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

  protected get storeFilter(): SQL | null {
    const storeCol = this.table.storeId;
    if (!storeCol) return null;
    const storeId = this.requireStore();
    return eq(storeCol, storeId);
  }

  protected requireStore(): string {
    const storeId = this.ctx.storeId;
    if (!storeId) {
      throw new Error('Active store required for this operation');
    }
    return storeId;
  }

  protected get tenantFilters(): SQL[] {
    const conditions: SQL[] = [this.orgFilter];
    const sf = this.storeFilter;
    if (sf) conditions.push(sf);
    return conditions;
  }

  async findMany(filters?: SQL): Promise<InferSelectModel<TTable>[]> {
    const conditions = this.tenantFilters;
    if (filters) conditions.push(filters);
    // Drizzle's .from() has a conditional generic (TableLikeHasEmptySelection)
    // that can't be resolved when TTable is still generic — cast required here.

    const rows = (await this.db
      .select()
      .from(this.table as PgTable)
      .where(and(...conditions))) as unknown as InferSelectModel<TTable>[];
    return rows;
  }

  async findById(id: string): Promise<InferSelectModel<TTable> | null> {
    const rows = (await this.db
      .select()
      .from(this.table as PgTable)
      .where(and(eq(this.table.id, id), ...this.tenantFilters))
      .limit(1)) as unknown as InferSelectModel<TTable>[];
    return rows[0] ?? null;
  }

  async create(
    data: Record<string, unknown>,
  ): Promise<InferSelectModel<TTable>> {
    const values: Record<string, unknown> = {
      ...data,
      organizationId: this.ctx.organizationId,
    };
    if (this.table.storeId) {
      values.storeId = this.requireStore();
    }
    // .insert().values() requires concrete column types — cast required here.

    const [row] = (await this.db
      .insert(this.table as PgTable)
      .values(values)
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
      .update(this.table as PgTable)
      .set(patch)
      .where(and(eq(this.table.id, id), ...this.tenantFilters))
      .returning();
    return (rows[0] as InferSelectModel<TTable> | undefined) ?? null;
  }

  async softDelete(id: string): Promise<InferSelectModel<TTable> | null> {
    if (!('deletedAt' in this.table)) {
      throw new Error(`Table does not support soft delete`);
    }
    const rows = await this.db
      .update(this.table as PgTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(this.table.id, id), ...this.tenantFilters))
      .returning();
    return (rows[0] as InferSelectModel<TTable> | undefined) ?? null;
  }

  async hardDelete(id: string): Promise<void> {
    // .delete() accepts PgTable directly — no cast needed.
    await this.db
      .delete(this.table)
      .where(and(eq(this.table.id, id), ...this.tenantFilters));
  }
}
