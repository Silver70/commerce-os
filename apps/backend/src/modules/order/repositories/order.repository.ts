import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, lt, gte, lte, asc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  orders,
  orderLineItems,
  orderTimeline,
  payments,
  shipments,
  refunds,
} from '../../../shared/database/schema';
import type {
  Order,
  NewOrder,
  NewOrderLineItem,
  NewOrderTimeline,
  Refund,
  NewRefund,
  Shipment,
  NewShipment,
  Payment,
} from '../../../shared/database/schema';
import {
  encodeCursor,
  decodeCursor,
} from '../../../shared/utils/pagination.util';

export interface OrderWithDetails extends Order {
  lineItems: (typeof orderLineItems.$inferSelect)[];
  timeline: (typeof orderTimeline.$inferSelect)[];
  payment: Payment | null;
  shipments: Shipment[];
}

export interface ListOrdersParams {
  orgId: string;
  storeId: string;
  status?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
}

export interface ListOrdersResult {
  orders: Order[];
  nextCursor: string | null;
}

@Injectable()
export class OrderRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async create(data: NewOrder): Promise<Order> {
    const [row] = await this.db.insert(orders).values(data).returning();
    return row;
  }

  async createLineItems(
    items: NewOrderLineItem[],
  ): Promise<(typeof orderLineItems.$inferSelect)[]> {
    if (items.length === 0) return [];
    return this.db.insert(orderLineItems).values(items).returning();
  }

  async addTimelineEntry(
    entry: NewOrderTimeline,
  ): Promise<typeof orderTimeline.$inferSelect> {
    const [row] = await this.db.insert(orderTimeline).values(entry).returning();
    return row;
  }

  async findById(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, orgId),
          eq(orders.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findByOrderNumber(
    orderNumber: string,
    orgId: string,
    storeId: string,
  ): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderNumber, orderNumber),
          eq(orders.organizationId, orgId),
          eq(orders.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findWithDetails(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<OrderWithDetails | null> {
    const order = await this.findById(orderId, orgId, storeId);
    if (!order) return null;

    const [lineItemRows, timelineRows, paymentRows, shipmentRows] =
      await Promise.all([
        this.db
          .select()
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, orderId)),
        this.db
          .select()
          .from(orderTimeline)
          .where(eq(orderTimeline.orderId, orderId))
          .orderBy(asc(orderTimeline.createdAt)),
        this.db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.orderId, orderId),
              eq(payments.organizationId, orgId),
              eq(payments.storeId, storeId),
            ),
          )
          .limit(1),
        this.db
          .select()
          .from(shipments)
          .where(
            and(
              eq(shipments.orderId, orderId),
              eq(shipments.organizationId, orgId),
              eq(shipments.storeId, storeId),
            ),
          )
          .orderBy(desc(shipments.createdAt)),
      ]);

    return {
      ...order,
      lineItems: lineItemRows,
      timeline: timelineRows,
      payment: paymentRows[0] ?? null,
      shipments: shipmentRows,
    };
  }

  async listWithFilters(params: ListOrdersParams): Promise<ListOrdersResult> {
    const { orgId, storeId, limit = 20 } = params;
    const conditions: SQL[] = [
      eq(orders.organizationId, orgId),
      eq(orders.storeId, storeId),
    ];

    if (params.status) {
      conditions.push(eq(orders.status, params.status as Order['status']));
    }
    if (params.customerId) {
      conditions.push(eq(orders.customerId, params.customerId));
    }
    if (params.from) {
      conditions.push(gte(orders.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(orders.createdAt, params.to));
    }
    if (params.cursor) {
      const decoded = decodeCursor<{ createdAt: string }>(params.cursor);
      conditions.push(lt(orders.createdAt, new Date(decoded.createdAt)));
    }

    const rows = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.createdAt.toISOString() })
        : null;

    return { orders: data, nextCursor };
  }

  async updateStatus(
    orderId: string,
    orgId: string,
    storeId: string,
    status: Order['status'],
  ): Promise<Order | null> {
    const [row] = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, orgId),
          eq(orders.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async updateFulfillmentStatus(
    orderId: string,
    orgId: string,
    storeId: string,
    fulfillmentStatus: Order['fulfillmentStatus'],
  ): Promise<Order | null> {
    const [row] = await this.db
      .update(orders)
      .set({ fulfillmentStatus, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, orgId),
          eq(orders.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async findPaymentByOrderId(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, orderId),
          eq(payments.organizationId, orgId),
          eq(payments.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createPayment(data: {
    organizationId: string;
    storeId: string;
    orderId: string;
    provider: 'stripe' | 'manual';
    status: 'pending' | 'captured';
    amount: number;
    currency: string;
  }): Promise<Payment> {
    const [row] = await this.db.insert(payments).values(data).returning();
    return row;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: Payment['status'],
  ): Promise<Payment | null> {
    const [row] = await this.db
      .update(payments)
      .set({ status, updatedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();
    return row ?? null;
  }

  async createShipment(data: NewShipment): Promise<Shipment> {
    const [row] = await this.db.insert(shipments).values(data).returning();
    return row;
  }

  async findShipmentsByOrder(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Shipment[]> {
    return this.db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.orderId, orderId),
          eq(shipments.organizationId, orgId),
          eq(shipments.storeId, storeId),
        ),
      )
      .orderBy(desc(shipments.createdAt));
  }

  async createRefund(data: NewRefund): Promise<Refund> {
    const [row] = await this.db.insert(refunds).values(data).returning();
    return row;
  }

  async findLineItemsByOrder(
    orderId: string,
  ): Promise<(typeof orderLineItems.$inferSelect)[]> {
    return this.db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
  }

  async generateOrderNumber(orgId: string, storeId: string): Promise<string> {
    const count = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(eq(orders.organizationId, orgId), eq(orders.storeId, storeId)),
      );
    const seq = count.length + 1;
    return `ORD-${String(seq).padStart(6, '0')}`;
  }
}
