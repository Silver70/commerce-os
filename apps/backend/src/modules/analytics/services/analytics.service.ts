import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import type { StatsPeriod } from './dashboard.service';

// Statuses that count as realized revenue — mirrors DashboardService. Composed
// as an inline SQL fragment (not a bound array) so it coerces cleanly against
// the `order_status` enum column, exactly as DashboardService does.
const REVENUE_STATUS_IN = sql`in ('paid', 'processing', 'shipped', 'delivered')`;

function periodDays(period: StatsPeriod): number {
  if (period === 'today') return 1;
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  return 90;
}

/** [start, now) window for the selected period. */
function getRange(period: StatsPeriod): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  const start = new Date(now);
  start.setDate(start.getDate() - periodDays(period));
  return { start, end: now };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface SalesAnalytics {
  period: StatsPeriod;
  topProducts: { productName: string; quantity: number; revenue: number }[];
  salesByCategory: {
    categoryName: string;
    quantity: number;
    revenue: number;
  }[];
  profit: {
    revenue: number;
    cost: number;
    grossProfit: number;
    marginPct: number;
    /** Share of revenue whose line items have a known cost price. */
    coveragePct: number;
  };
  discounts: {
    couponCode: string;
    orders: number;
    discountTotal: number;
    revenue: number;
  }[];
}

export interface OrdersAnalytics {
  period: StatsPeriod;
  statusBreakdown: { status: string; count: number; revenue: number }[];
  cartAbandonment: {
    convertedCount: number;
    abandonedCount: number;
    abandonmentRatePct: number;
    lostValue: number;
  };
  refunds: { count: number; amount: number; refundRatePct: number };
  payments: {
    captured: number;
    failed: number;
    pending: number;
    successRatePct: number;
  };
}

export interface CustomersAnalytics {
  period: StatsPeriod;
  totalCustomers: number;
  newInPeriod: number;
  growth: { date: string; count: number }[];
  newVsReturning: { newCustomers: number; returning: number };
}

export interface InventoryAnalytics {
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  stockUnits: number;
  stockValueAtCost: number;
  lowStock: {
    productName: string;
    variantName: string | null;
    sku: string;
    available: number;
    threshold: number;
  }[];
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  // ─── Sales ──────────────────────────────────────────────────────────────────

  async getSales(
    orgId: string,
    storeId: string,
    period: StatsPeriod,
  ): Promise<SalesAnalytics> {
    const { start, end } = getRange(period);
    const [topProducts, salesByCategory, profit, discounts] = await Promise.all(
      [
        this.topProducts(orgId, storeId, start, end),
        this.salesByCategory(orgId, storeId, start, end),
        this.profit(orgId, storeId, start, end),
        this.discounts(orgId, storeId, start, end),
      ],
    );
    return { period, topProducts, salesByCategory, profit, discounts };
  }

  private async topProducts(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<SalesAnalytics['topProducts']> {
    const res = await this.db.execute(sql`
      SELECT
        li.product_name AS product_name,
        SUM(li.quantity)::bigint AS quantity,
        SUM(li.total_price)::bigint AS revenue
      FROM order_line_items li
      JOIN orders o ON o.id = li.order_id
      WHERE li.organization_id = ${orgId}
        AND li.store_id = ${storeId}
        AND o.status ${REVENUE_STATUS_IN}
        AND o.created_at >= ${start.toISOString()}
        AND o.created_at < ${end.toISOString()}
      GROUP BY li.product_name
      ORDER BY revenue DESC
      LIMIT 8
    `);
    return (
      res.rows as { product_name: string; quantity: string; revenue: string }[]
    ).map((r) => ({
      productName: r.product_name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  private async salesByCategory(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<SalesAnalytics['salesByCategory']> {
    // Joins to the LIVE variant→product→category graph (line items don't
    // snapshot a category). Lines with no variant, or a product in no category,
    // fall into "Uncategorized". A recategorized product reshapes history —
    // acceptable for analytics.
    const res = await this.db.execute(sql`
      SELECT
        COALESCE(c.name, 'Uncategorized') AS category_name,
        SUM(li.quantity)::bigint AS quantity,
        SUM(li.total_price)::bigint AS revenue
      FROM order_line_items li
      JOIN orders o ON o.id = li.order_id
      LEFT JOIN product_variants v ON v.id = li.variant_id
      LEFT JOIN product_categories pc ON pc.product_id = v.product_id
      LEFT JOIN categories c ON c.id = pc.category_id
      WHERE li.organization_id = ${orgId}
        AND li.store_id = ${storeId}
        AND o.status ${REVENUE_STATUS_IN}
        AND o.created_at >= ${start.toISOString()}
        AND o.created_at < ${end.toISOString()}
      GROUP BY COALESCE(c.name, 'Uncategorized')
      ORDER BY revenue DESC
      LIMIT 10
    `);
    return (
      res.rows as { category_name: string; quantity: string; revenue: string }[]
    ).map((r) => ({
      categoryName: r.category_name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  private async profit(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<SalesAnalytics['profit']> {
    // costPrice is nullable — only lines with a known cost contribute to `cost`,
    // and `coveragePct` reports how much of revenue that covers so the margin is
    // read with the right caveat.
    const res = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(li.total_price), 0)::bigint AS revenue,
        COALESCE(SUM(
          CASE WHEN v.cost_price IS NOT NULL
               THEN v.cost_price * li.quantity END
        ), 0)::bigint AS cost,
        COALESCE(SUM(
          CASE WHEN v.cost_price IS NOT NULL
               THEN li.total_price END
        ), 0)::bigint AS revenue_with_cost
      FROM order_line_items li
      JOIN orders o ON o.id = li.order_id
      LEFT JOIN product_variants v ON v.id = li.variant_id
      WHERE li.organization_id = ${orgId}
        AND li.store_id = ${storeId}
        AND o.status ${REVENUE_STATUS_IN}
        AND o.created_at >= ${start.toISOString()}
        AND o.created_at < ${end.toISOString()}
    `);
    const row = res.rows[0] as {
      revenue: string;
      cost: string;
      revenue_with_cost: string;
    };
    const revenue = Number(row.revenue);
    const cost = Number(row.cost);
    const revenueWithCost = Number(row.revenue_with_cost);
    const grossProfit = revenueWithCost - cost;
    return {
      revenue,
      cost,
      grossProfit,
      marginPct: pct(grossProfit, revenueWithCost),
      coveragePct: pct(revenueWithCost, revenue),
    };
  }

  private async discounts(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<SalesAnalytics['discounts']> {
    const res = await this.db.execute(sql`
      SELECT
        coupon_code,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(discount_amount), 0)::bigint AS discount_total,
        COALESCE(SUM(total), 0)::bigint AS revenue
      FROM orders
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND coupon_code IS NOT NULL
        AND status ${REVENUE_STATUS_IN}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      GROUP BY coupon_code
      ORDER BY discount_total DESC
      LIMIT 10
    `);
    return (
      res.rows as {
        coupon_code: string;
        orders: string;
        discount_total: string;
        revenue: string;
      }[]
    ).map((r) => ({
      couponCode: r.coupon_code,
      orders: Number(r.orders),
      discountTotal: Number(r.discount_total),
      revenue: Number(r.revenue),
    }));
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(
    orgId: string,
    storeId: string,
    period: StatsPeriod,
  ): Promise<OrdersAnalytics> {
    const { start, end } = getRange(period);
    const [statusBreakdown, cartAbandonment, refunds, payments, grossRevenue] =
      await Promise.all([
        this.statusBreakdown(orgId, storeId, start, end),
        this.cartAbandonment(orgId, storeId, start, end),
        this.refundTotals(orgId, storeId, start, end),
        this.paymentTotals(orgId, storeId, start, end),
        this.grossRevenue(orgId, storeId, start, end),
      ]);
    return {
      period,
      statusBreakdown,
      cartAbandonment,
      refunds: {
        ...refunds,
        refundRatePct: pct(refunds.amount, grossRevenue),
      },
      payments,
    };
  }

  private async statusBreakdown(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<OrdersAnalytics['statusBreakdown']> {
    const res = await this.db.execute(sql`
      SELECT status, COUNT(*)::bigint AS count, COALESCE(SUM(total), 0)::bigint AS revenue
      FROM orders
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      GROUP BY status
      ORDER BY count DESC
    `);
    return (
      res.rows as { status: string; count: string; revenue: string }[]
    ).map((r) => ({
      status: r.status,
      count: Number(r.count),
      revenue: Number(r.revenue),
    }));
  }

  private async cartAbandonment(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<OrdersAnalytics['cartAbandonment']> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'converted')::bigint AS converted,
        COUNT(*) FILTER (WHERE status = 'abandoned')::bigint AS abandoned,
        COALESCE(SUM(total) FILTER (WHERE status = 'abandoned'), 0)::bigint AS lost_value
      FROM carts
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `);
    const row = res.rows[0] as {
      converted: string;
      abandoned: string;
      lost_value: string;
    };
    const convertedCount = Number(row.converted);
    const abandonedCount = Number(row.abandoned);
    return {
      convertedCount,
      abandonedCount,
      abandonmentRatePct: pct(abandonedCount, convertedCount + abandonedCount),
      lostValue: Number(row.lost_value),
    };
  }

  private async refundTotals(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<{ count: number; amount: number }> {
    const res = await this.db.execute(sql`
      SELECT COUNT(*)::bigint AS count, COALESCE(SUM(amount), 0)::bigint AS amount
      FROM refunds
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND status = 'succeeded'
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `);
    const row = res.rows[0] as { count: string; amount: string };
    return { count: Number(row.count), amount: Number(row.amount) };
  }

  private async paymentTotals(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<OrdersAnalytics['payments']> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'captured')::bigint AS captured,
        COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed,
        COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending
      FROM payments
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `);
    const row = res.rows[0] as {
      captured: string;
      failed: string;
      pending: string;
    };
    const captured = Number(row.captured);
    const failed = Number(row.failed);
    return {
      captured,
      failed,
      pending: Number(row.pending),
      successRatePct: pct(captured, captured + failed),
    };
  }

  private async grossRevenue(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const res = await this.db.execute(sql`
      SELECT COALESCE(SUM(total), 0)::bigint AS value
      FROM orders
      WHERE organization_id = ${orgId}
        AND store_id = ${storeId}
        AND status ${REVENUE_STATUS_IN}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `);
    return Number((res.rows[0] as { value: string }).value);
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  async getCustomers(
    orgId: string,
    storeId: string,
    period: StatsPeriod,
  ): Promise<CustomersAnalytics> {
    const { start, end } = getRange(period);
    // NB: `customers` is org-scoped (no store_id column), so total/new/growth
    // are per-organization. New-vs-returning is derived from store-scoped orders.
    const [totals, growth, newVsReturning] = await Promise.all([
      this.customerTotals(orgId, start, end),
      this.customerGrowth(orgId, start, end, periodDays(period)),
      this.newVsReturning(orgId, storeId, start, end),
    ]);
    return {
      period,
      totalCustomers: totals.total,
      newInPeriod: totals.newInPeriod,
      growth,
      newVsReturning,
    };
  }

  private async customerTotals(
    orgId: string,
    start: Date,
    end: Date,
  ): Promise<{ total: number; newInPeriod: number }> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (
          WHERE created_at >= ${start.toISOString()} AND created_at < ${end.toISOString()}
        )::bigint AS new_in_period
      FROM customers
      WHERE organization_id = ${orgId}
    `);
    const row = res.rows[0] as { total: string; new_in_period: string };
    return { total: Number(row.total), newInPeriod: Number(row.new_in_period) };
  }

  private async customerGrowth(
    orgId: string,
    start: Date,
    end: Date,
    days: number,
  ): Promise<CustomersAnalytics['growth']> {
    const res = await this.db.execute(sql`
      SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM customers
      WHERE organization_id = ${orgId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      GROUP BY 1
      ORDER BY 1
    `);
    const map = new Map<string, number>();
    for (const r of res.rows as { day: Date; count: string }[]) {
      map.set(new Date(r.day).toISOString().slice(0, 10), Number(r.count));
    }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: map.get(key) ?? 0 };
    });
  }

  private async newVsReturning(
    orgId: string,
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<CustomersAnalytics['newVsReturning']> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE prior.id IS NULL)::bigint AS new_orders,
        COUNT(*) FILTER (WHERE prior.id IS NOT NULL)::bigint AS returning_orders
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT 1 AS id FROM orders p
        WHERE p.customer_id = o.customer_id
          AND p.organization_id = o.organization_id
          AND p.store_id = o.store_id
          AND p.created_at < ${start.toISOString()}
        LIMIT 1
      ) prior ON true
      WHERE o.organization_id = ${orgId}
        AND o.store_id = ${storeId}
        AND o.customer_id IS NOT NULL
        AND o.created_at >= ${start.toISOString()}
        AND o.created_at < ${end.toISOString()}
    `);
    const row = res.rows[0] as {
      new_orders: string;
      returning_orders: string;
    };
    return {
      newCustomers: Number(row.new_orders),
      returning: Number(row.returning_orders),
    };
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async getInventory(
    orgId: string,
    storeId: string,
  ): Promise<InventoryAnalytics> {
    const [totals, lowStock] = await Promise.all([
      this.inventoryTotals(orgId, storeId),
      this.lowStockList(orgId, storeId),
    ]);
    return { ...totals, lowStock };
  }

  private async inventoryTotals(
    orgId: string,
    storeId: string,
  ): Promise<Omit<InventoryAnalytics, 'lowStock'>> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE (quantity - reserved) <= 0)::bigint AS out_of_stock,
        COUNT(*) FILTER (
          WHERE (quantity - reserved) > 0 AND (quantity - reserved) <= low_stock_threshold
        )::bigint AS low_stock,
        COUNT(*) FILTER (WHERE (quantity - reserved) > low_stock_threshold)::bigint AS in_stock,
        COALESCE(SUM(GREATEST(quantity - reserved, 0)), 0)::bigint AS stock_units,
        COALESCE(SUM(quantity * COALESCE(v.cost_price, 0)), 0)::bigint AS stock_value
      FROM inventory_items ii
      JOIN product_variants v ON v.id = ii.variant_id
      WHERE ii.organization_id = ${orgId}
        AND ii.store_id = ${storeId}
    `);
    const row = res.rows[0] as {
      out_of_stock: string;
      low_stock: string;
      in_stock: string;
      stock_units: string;
      stock_value: string;
    };
    return {
      outOfStockCount: Number(row.out_of_stock),
      lowStockCount: Number(row.low_stock),
      inStockCount: Number(row.in_stock),
      stockUnits: Number(row.stock_units),
      stockValueAtCost: Number(row.stock_value),
    };
  }

  private async lowStockList(
    orgId: string,
    storeId: string,
  ): Promise<InventoryAnalytics['lowStock']> {
    const res = await this.db.execute(sql`
      SELECT
        p.name AS product_name,
        v.name AS variant_name,
        v.sku AS sku,
        (ii.quantity - ii.reserved) AS available,
        ii.low_stock_threshold AS threshold
      FROM inventory_items ii
      JOIN product_variants v ON v.id = ii.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE ii.organization_id = ${orgId}
        AND ii.store_id = ${storeId}
        AND (ii.quantity - ii.reserved) <= ii.low_stock_threshold
      ORDER BY available ASC
      LIMIT 10
    `);
    return (
      res.rows as {
        product_name: string;
        variant_name: string | null;
        sku: string;
        available: number;
        threshold: number;
      }[]
    ).map((r) => ({
      productName: r.product_name,
      variantName: r.variant_name,
      sku: r.sku,
      available: Number(r.available),
      threshold: Number(r.threshold),
    }));
  }
}
