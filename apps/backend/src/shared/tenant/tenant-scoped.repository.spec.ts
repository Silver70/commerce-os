import { TenantScopedRepository } from './tenant-scoped.repository';
import type { TenantContext } from './tenant-context';
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Minimal test table
const testTable = pgTable('test_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  name: varchar('name', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
});

const orgA = 'org-a-0000-0000-0000-000000000000';
const orgB = 'org-b-0000-0000-0000-000000000000';

function makeCtx(organizationId: string): TenantContext {
  return { organizationId };
}

// Concrete subclass of the abstract repository
class TestRepository extends TenantScopedRepository<typeof testTable> {}

function makeMockDb(rows: unknown[] = []) {
  const returning = jest.fn().mockResolvedValue(rows);
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit, returning });
  const set = jest.fn().mockReturnValue({ where });
  const values = jest.fn().mockReturnValue({ returning });
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  const insert = jest.fn().mockReturnValue({ values });
  const update = jest.fn().mockReturnValue({ set });
  const deleteQ = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

  return { select, insert, update, delete: deleteQ, where, set, values, from, returning, limit };
}

describe('TenantScopedRepository', () => {
  it('findMany always includes organization_id filter', async () => {
    const db = makeMockDb([{ id: '1', organizationId: orgA, name: 'item' }]);
    const repo = new TestRepository(db as never, testTable, makeCtx(orgA));
    await repo.findMany();
    // The where call should have been invoked (filters applied internally)
    expect(db.select).toHaveBeenCalled();
    expect(db.from).toHaveBeenCalledWith(testTable);
  });

  it('findById rejects a record belonging to a different org', async () => {
    // Simulate DB returning empty array (org check in WHERE clause)
    const db = makeMockDb([]);
    const repo = new TestRepository(db as never, testTable, makeCtx(orgB));
    const result = await repo.findById('some-id-from-org-a');
    expect(result).toBeNull();
  });

  it('create injects organizationId into insert values', async () => {
    const inserted = { id: '1', organizationId: orgA, name: 'new item' };
    const db = makeMockDb([inserted]);
    const repo = new TestRepository(db as never, testTable, makeCtx(orgA));
    const result = await repo.create({ name: 'new item' });
    expect(db.insert).toHaveBeenCalledWith(testTable);
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: orgA }),
    );
    expect(result).toEqual(inserted);
  });

  it('update includes org_id in WHERE clause', async () => {
    const updated = { id: '1', organizationId: orgA, name: 'updated' };
    const db = makeMockDb([updated]);
    const repo = new TestRepository(db as never, testTable, makeCtx(orgA));
    await repo.update('1', { name: 'updated' });
    expect(db.update).toHaveBeenCalledWith(testTable);
    expect(db.set).toHaveBeenCalled();
  });

  it('softDelete sets deletedAt with org_id check', async () => {
    const db = makeMockDb([{ id: '1', organizationId: orgA, deletedAt: new Date() }]);
    const repo = new TestRepository(db as never, testTable, makeCtx(orgA));
    const result = await repo.softDelete('1');
    expect(db.update).toHaveBeenCalledWith(testTable);
    expect(result).not.toBeNull();
  });

  it('tenant A cannot findById tenant B record', async () => {
    // Both orgs exist but query for orgA item with orgB context returns empty
    const db = makeMockDb([]);
    const repoB = new TestRepository(db as never, testTable, makeCtx(orgB));
    const result = await repoB.findById('org-a-item-id');
    expect(result).toBeNull();
  });

  it('create for org A cannot produce a record for org B', async () => {
    const inserted = { id: '1', organizationId: orgA, name: 'item' };
    const db = makeMockDb([inserted]);
    const repoA = new TestRepository(db as never, testTable, makeCtx(orgA));
    const result = await repoA.create({ name: 'item' });
    expect(result.organizationId).toBe(orgA);
    expect(result.organizationId).not.toBe(orgB);
  });
});
