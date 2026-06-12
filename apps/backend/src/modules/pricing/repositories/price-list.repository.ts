import { Inject, Injectable } from '@nestjs/common';
import {
  eq,
  and,
  or,
  isNull,
  lte,
  gte,
  inArray,
  desc,
  asc,
  sql,
} from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  priceLists,
  priceListPrices,
  priceListAssignments,
  productVariants,
} from '../../../shared/database/schema';
import type {
  PriceList,
  NewPriceList,
  PriceListPrice,
  PriceListAssignment,
  NewPriceListAssignment,
} from '../../../shared/database/schema';

export interface CandidatePriceList extends PriceList {
  // 'customer' assignments beat 'group' assignments during resolution
  tier: 'customer' | 'group';
}

@Injectable()
export class PriceListRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  // ─── Lists CRUD ──────────────────────────────────────────────────────────────

  async findManyLists(orgId: string, storeId: string): Promise<PriceList[]> {
    return this.db
      .select()
      .from(priceLists)
      .where(
        and(
          eq(priceLists.organizationId, orgId),
          eq(priceLists.storeId, storeId),
        ),
      )
      .orderBy(asc(priceLists.priority), desc(priceLists.createdAt));
  }

  async findListById(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<PriceList | null> {
    const [row] = await this.db
      .select()
      .from(priceLists)
      .where(
        and(
          eq(priceLists.id, id),
          eq(priceLists.organizationId, orgId),
          eq(priceLists.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createList(
    data: Omit<NewPriceList, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PriceList> {
    const [row] = await this.db.insert(priceLists).values(data).returning();
    return row;
  }

  async updateList(
    id: string,
    orgId: string,
    storeId: string,
    data: Partial<
      Omit<NewPriceList, 'id' | 'organizationId' | 'storeId' | 'createdAt'>
    >,
  ): Promise<PriceList | null> {
    const [row] = await this.db
      .update(priceLists)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(priceLists.id, id),
          eq(priceLists.organizationId, orgId),
          eq(priceLists.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async deleteList(id: string, orgId: string, storeId: string): Promise<void> {
    await this.db
      .delete(priceLists)
      .where(
        and(
          eq(priceLists.id, id),
          eq(priceLists.organizationId, orgId),
          eq(priceLists.storeId, storeId),
        ),
      );
  }

  // ─── Resolution queries ──────────────────────────────────────────────────────

  /**
   * Active, in-window price lists assigned to this customer or group, ordered
   * by tier (customer beats group), then priority asc, then newest first.
   * Deduped so each list appears once at its best (lowest) tier.
   */
  async findCandidateLists(
    orgId: string,
    storeId: string,
    customerId: string | null,
    groupId: string | null,
    now: Date,
  ): Promise<CandidatePriceList[]> {
    const assignmentMatch = [];
    if (customerId)
      assignmentMatch.push(eq(priceListAssignments.customerId, customerId));
    if (groupId)
      assignmentMatch.push(eq(priceListAssignments.groupId, groupId));
    if (assignmentMatch.length === 0) return [];

    const tierExpr = customerId
      ? sql<number>`CASE WHEN ${priceListAssignments.customerId} = ${customerId} THEN 0 ELSE 1 END`
      : sql<number>`1`;

    const rows = await this.db
      .select({ list: priceLists, tierRank: tierExpr })
      .from(priceLists)
      .innerJoin(
        priceListAssignments,
        eq(priceListAssignments.priceListId, priceLists.id),
      )
      .where(
        and(
          eq(priceLists.organizationId, orgId),
          eq(priceLists.storeId, storeId),
          eq(priceLists.isActive, true),
          or(isNull(priceLists.startsAt), lte(priceLists.startsAt, now)),
          or(isNull(priceLists.endsAt), gte(priceLists.endsAt, now)),
          or(...assignmentMatch),
        ),
      )
      .orderBy(
        asc(tierExpr),
        asc(priceLists.priority),
        desc(priceLists.createdAt),
      );

    // Dedupe: keep the first (best-tier) occurrence of each list.
    const seen = new Set<string>();
    const result: CandidatePriceList[] = [];
    for (const row of rows) {
      if (seen.has(row.list.id)) continue;
      seen.add(row.list.id);
      result.push({
        ...row.list,
        tier: row.tierRank === 0 ? 'customer' : 'group',
      });
    }
    return result;
  }

  /** Batched fixed-price rows across a set of lists and variants (no N+1). */
  async findFixedPrices(
    priceListIds: string[],
    variantIds: string[],
  ): Promise<PriceListPrice[]> {
    if (priceListIds.length === 0 || variantIds.length === 0) return [];
    return this.db
      .select()
      .from(priceListPrices)
      .where(
        and(
          inArray(priceListPrices.priceListId, priceListIds),
          inArray(priceListPrices.variantId, variantIds),
        ),
      );
  }

  // ─── Fixed prices CRUD ───────────────────────────────────────────────────────

  async findPrices(
    priceListId: string,
    orgId: string,
  ): Promise<PriceListPrice[]> {
    return this.db
      .select()
      .from(priceListPrices)
      .where(
        and(
          eq(priceListPrices.priceListId, priceListId),
          eq(priceListPrices.organizationId, orgId),
        ),
      );
  }

  /** Bulk upsert per-variant prices for a fixed list. */
  async setPrices(
    priceListId: string,
    orgId: string,
    entries: { variantId: string; price: number }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.db
      .insert(priceListPrices)
      .values(
        entries.map((e) => ({
          organizationId: orgId,
          priceListId,
          variantId: e.variantId,
          price: e.price,
        })),
      )
      .onConflictDoUpdate({
        target: [priceListPrices.priceListId, priceListPrices.variantId],
        set: { price: sql`excluded.price`, updatedAt: new Date() },
      });
  }

  async deletePrice(
    priceListId: string,
    variantId: string,
    orgId: string,
  ): Promise<void> {
    await this.db
      .delete(priceListPrices)
      .where(
        and(
          eq(priceListPrices.priceListId, priceListId),
          eq(priceListPrices.variantId, variantId),
          eq(priceListPrices.organizationId, orgId),
        ),
      );
  }

  /** Filter a set of variant ids down to those owned by this org+store. */
  async filterOwnedVariantIds(
    orgId: string,
    storeId: string,
    variantIds: string[],
  ): Promise<string[]> {
    if (variantIds.length === 0) return [];
    const rows = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.organizationId, orgId),
          eq(productVariants.storeId, storeId),
          inArray(productVariants.id, variantIds),
        ),
      );
    return rows.map((r) => r.id);
  }

  // ─── Assignments ─────────────────────────────────────────────────────────────

  async findAssignments(
    priceListId: string,
    orgId: string,
  ): Promise<PriceListAssignment[]> {
    return this.db
      .select()
      .from(priceListAssignments)
      .where(
        and(
          eq(priceListAssignments.priceListId, priceListId),
          eq(priceListAssignments.organizationId, orgId),
        ),
      );
  }

  async createAssignment(
    data: Omit<NewPriceListAssignment, 'id' | 'createdAt'>,
  ): Promise<PriceListAssignment> {
    const [row] = await this.db
      .insert(priceListAssignments)
      .values(data)
      .returning();
    return row;
  }

  async deleteAssignment(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(priceListAssignments)
      .where(
        and(
          eq(priceListAssignments.id, id),
          eq(priceListAssignments.organizationId, orgId),
        ),
      );
  }

  /** Lists currently assigned to a customer (for the customer detail page). */
  async findListsAssignedToCustomer(
    customerId: string,
    orgId: string,
  ): Promise<PriceList[]> {
    return this.db
      .select({ list: priceLists })
      .from(priceLists)
      .innerJoin(
        priceListAssignments,
        eq(priceListAssignments.priceListId, priceLists.id),
      )
      .where(
        and(
          eq(priceListAssignments.organizationId, orgId),
          eq(priceListAssignments.customerId, customerId),
        ),
      )
      .then((rows) => rows.map((r) => r.list));
  }

  /** Lists currently assigned to a group (for the group detail page). */
  async findListsAssignedToGroup(
    groupId: string,
    orgId: string,
  ): Promise<PriceList[]> {
    return this.db
      .select({ list: priceLists })
      .from(priceLists)
      .innerJoin(
        priceListAssignments,
        eq(priceListAssignments.priceListId, priceLists.id),
      )
      .where(
        and(
          eq(priceListAssignments.organizationId, orgId),
          eq(priceListAssignments.groupId, groupId),
        ),
      )
      .then((rows) => rows.map((r) => r.list));
  }
}
