import { Inject, Injectable } from '@nestjs/common';
import { eq, and, lt, lte, sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  inventoryItems,
  stockReservations,
} from '../../../shared/database/schema';
import type {
  InventoryItem,
  StockReservation,
} from '../../../shared/database/schema';

export interface ReserveInput {
  variantId: string;
  quantity: number;
  cartId?: string;
  orderId?: string;
  organizationId: string;
  storeId: string;
  expiresAt: Date;
}

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

  async findAll(orgId: string, storeId: string): Promise<InventoryItem[]> {
    return this.db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.organizationId, orgId),
          eq(inventoryItems.storeId, storeId),
        ),
      );
  }

  async findLowStock(orgId: string, storeId: string): Promise<InventoryItem[]> {
    return this.db
      .select()
      .from(inventoryItems)
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
