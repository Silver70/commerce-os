import { Inject, Injectable } from '@nestjs/common';
import {
  eq,
  and,
  or,
  ilike,
  asc,
  count,
  lt,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  inventoryItems,
  stockReservations,
  productVariants,
  products,
} from '../../../shared/database/schema';
import type {
  InventoryItem,
  StockReservation,
} from '../../../shared/database/schema';
import {
  offsetFor,
  DEFAULT_PAGE_SIZE,
} from '../../../shared/utils/pagination.util';
import { likePattern } from '../../../shared/utils/search.util';

/** Which stock bucket the inventory list is filtered to. */
export type InventoryStockFilter = 'low' | 'out';

export interface ListInventoryOptions {
  status?: InventoryStockFilter;
  search?: string;
  page?: number;
  limit?: number;
}

/** Badge counts for the all / low / out tabs, under the active search. */
export interface InventoryCounts {
  all: number;
  low: number;
  out: number;
}

export interface PaginatedInventory {
  items: InventoryItemView[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: InventoryCounts;
}

export interface ReserveInput {
  variantId: string;
  quantity: number;
  cartId?: string;
  orderId?: string;
  organizationId: string;
  storeId: string;
  expiresAt: Date;
}

/** Inventory item enriched with variant + product labels for display. */
export type InventoryItemView = InventoryItem & {
  sku: string;
  variantName: string | null;
  productName: string;
};

/** Projection used by the list queries to join variant + product labels. */
const inventoryViewColumns = {
  id: inventoryItems.id,
  organizationId: inventoryItems.organizationId,
  storeId: inventoryItems.storeId,
  variantId: inventoryItems.variantId,
  quantity: inventoryItems.quantity,
  reserved: inventoryItems.reserved,
  allowBackorder: inventoryItems.allowBackorder,
  lowStockThreshold: inventoryItems.lowStockThreshold,
  updatedAt: inventoryItems.updatedAt,
  sku: productVariants.sku,
  variantName: productVariants.name,
  productName: products.name,
} as const;

@Injectable()
export class InventoryRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findByVariantId(
    variantId: string,
    orgId: string,
    storeId: string,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.variantId, variantId),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findById(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /** Sellable quantity: on-hand minus reserved. */
  private get available(): SQL<number> {
    return sql<number>`${inventoryItems.quantity} - ${inventoryItems.reserved}`;
  }

  /** Filters shared by the page query and all three tab counts. */
  private inventoryFilters(
    orgId: string,
    storeId: string,
    opts: ListInventoryOptions,
  ): SQL[] {
    const conditions: SQL[] = [
      eq(inventoryItems.organizationId, orgId),
      eq(inventoryItems.storeId, storeId),
    ];
    if (opts.search) {
      const pattern = likePattern(opts.search);
      const match = or(
        ilike(products.name, pattern),
        ilike(productVariants.sku, pattern),
      );
      if (match) conditions.push(match);
    }
    return conditions;
  }

  /** `low` keeps the original semantics (at or below threshold, out included). */
  private stockFilter(status?: InventoryStockFilter): SQL | undefined {
    if (status === 'low')
      return lte(this.available, inventoryItems.lowStockThreshold);
    if (status === 'out') return lte(this.available, 0);
    return undefined;
  }

  async findAll(
    orgId: string,
    storeId: string,
    opts: ListInventoryOptions = {},
  ): Promise<PaginatedInventory> {
    const limit = opts.limit ?? DEFAULT_PAGE_SIZE;
    const page = opts.page ?? 1;
    const base = this.inventoryFilters(orgId, storeId, opts);

    const whereFor = (status?: InventoryStockFilter) => {
      const stock = this.stockFilter(status);
      return and(...(stock ? [...base, stock] : base));
    };

    const countFor = (status?: InventoryStockFilter) =>
      this.db
        .select({ value: count() })
        .from(inventoryItems)
        .innerJoin(
          productVariants,
          eq(inventoryItems.variantId, productVariants.id),
        )
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(whereFor(status));

    // Page + all three tab badge counts issued concurrently — one round trip.
    const [items, [all], [low], [out]] = await Promise.all([
      this.db
        .select(inventoryViewColumns)
        .from(inventoryItems)
        .innerJoin(
          productVariants,
          eq(inventoryItems.variantId, productVariants.id),
        )
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(whereFor(opts.status))
        // Deterministic order — offset pagination repeats or drops rows
        // without a total ordering.
        .orderBy(asc(products.name), asc(productVariants.id))
        .limit(limit)
        .offset(offsetFor(page, limit)),
      countFor(undefined),
      countFor('low'),
      countFor('out'),
    ]);

    const totalCount =
      opts.status === 'low'
        ? low.value
        : opts.status === 'out'
          ? out.value
          : all.value;

    return {
      items,
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      counts: { all: all.value, low: low.value, out: out.value },
    };
  }

  async findLowStock(
    orgId: string,
    storeId: string,
  ): Promise<InventoryItemView[]> {
    return this.db
      .select(inventoryViewColumns)
      .from(inventoryItems)
      .innerJoin(
        productVariants,
        eq(inventoryItems.variantId, productVariants.id),
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
          lte(
            sql`${inventoryItems.quantity} - ${inventoryItems.reserved}`,
            inventoryItems.lowStockThreshold,
          ),
        ),
      );
  }

  async createForVariant(
    variantId: string,
    orgId: string,
    storeId: string,
    initialQuantity = 0,
  ): Promise<InventoryItem> {
    const [row] = await this.db
      .insert(inventoryItems)
      .values({
        variantId,
        organizationId: orgId,
        storeId,
        quantity: initialQuantity,
        reserved: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      const existing = await this.findByVariantId(variantId, orgId, storeId);
      if (!existing) {
        throw new Error(
          `Inventory item not found after insert for variant ${variantId}`,
        );
      }
      return existing;
    }
    return row;
  }

  async adjustQuantity(
    id: string,
    orgId: string,
    storeId: string,
    delta: number,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .update(inventoryItems)
      .set({
        quantity: sql`${inventoryItems.quantity} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async incrementReserved(
    id: string,
    orgId: string,
    storeId: string,
    qty: number,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .update(inventoryItems)
      .set({
        reserved: sql`${inventoryItems.reserved} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async decrementReserved(
    id: string,
    orgId: string,
    storeId: string,
    qty: number,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .update(inventoryItems)
      .set({
        reserved: sql`GREATEST(${inventoryItems.reserved} - ${qty}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async convertReservation(
    id: string,
    orgId: string,
    storeId: string,
    qty: number,
  ): Promise<InventoryItem | null> {
    const [row] = await this.db
      .update(inventoryItems)
      .set({
        quantity: sql`${inventoryItems.quantity} - ${qty}`,
        reserved: sql`GREATEST(${inventoryItems.reserved} - ${qty}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async createReservation(input: ReserveInput): Promise<StockReservation> {
    const item = await this.findByVariantId(
      input.variantId,
      input.organizationId,
      input.storeId,
    );
    if (!item)
      throw new Error(`No inventory item found for variant ${input.variantId}`);

    const [reservation] = await this.db
      .insert(stockReservations)
      .values({
        organizationId: input.organizationId,
        storeId: input.storeId,
        inventoryItemId: item.id,
        cartId: input.cartId,
        orderId: input.orderId,
        quantity: input.quantity,
        status: 'active',
        expiresAt: input.expiresAt,
      })
      .returning();

    await this.incrementReserved(
      item.id,
      input.organizationId,
      input.storeId,
      input.quantity,
    );

    return reservation;
  }

  async findReservation(
    reservationId: string,
    orgId: string,
    storeId: string,
  ): Promise<StockReservation | null> {
    const [row] = await this.db
      .select()
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.id, reservationId),
          eq(stockReservations.organizationId, orgId),
          eq(stockReservations.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findActiveReservationsByOrder(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<StockReservation[]> {
    return this.db
      .select()
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.orderId, orderId),
          eq(stockReservations.organizationId, orgId),
          eq(stockReservations.storeId, storeId),
          eq(stockReservations.status, 'active'),
        ),
      );
  }

  async updateReservationStatus(
    reservationId: string,
    status: 'released' | 'converted' | 'expired',
  ): Promise<void> {
    await this.db
      .update(stockReservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(stockReservations.id, reservationId));
  }

  async associateReservationsWithOrder(
    reservationIds: string[],
    orderId: string,
  ): Promise<void> {
    if (reservationIds.length === 0) return;
    for (const resId of reservationIds) {
      await this.db
        .update(stockReservations)
        .set({ orderId, updatedAt: new Date() })
        .where(eq(stockReservations.id, resId));
    }
  }

  async findStaleActiveReservations(): Promise<StockReservation[]> {
    return this.db
      .select()
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.status, 'active'),
          lt(stockReservations.expiresAt, new Date()),
        ),
      );
  }
}
