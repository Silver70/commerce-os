import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  orders,
  orderLineItems,
  orderTimeline,
  payments,
} from '../../../shared/database/schema';
import type {
  Order,
  NewOrder,
  NewOrderLineItem,
  NewOrderTimeline,
} from '../../../shared/database/schema';

export interface OrderWithDetails extends Order {
  lineItems: (typeof orderLineItems.$inferSelect)[];
  timeline: (typeof orderTimeline.$inferSelect)[];
  payment: typeof payments.$inferSelect | null;
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
    return this.db.insert(orderLineItems).values(items).returning();
  }

  async addTimelineEntry(
    entry: NewOrderTimeline,
  ): Promise<typeof orderTimeline.$inferSelect> {
    const [row] = await this.db.insert(orderTimeline).values(entry).returning();
    return row;
  }

  async findById(orderId: string, orgId: string): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async updateStatus(
    orderId: string,
    orgId: string,
    status: Order['status'],
  ): Promise<Order | null> {
    const [row] = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  async generateOrderNumber(orgId: string): Promise<string> {
    const count = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.organizationId, orgId));
    const seq = count.length + 1;
    return `ORD-${String(seq).padStart(6, '0')}`;
  }
}
