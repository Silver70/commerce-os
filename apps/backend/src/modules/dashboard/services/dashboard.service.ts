import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';

export type StatsPeriod = 'today' | '7d' | '30d' | '90d';

interface MetricWithSparkline {
  current: number;
  prior: number;
  delta: number;
  sparkline: number[];
}

export interface DashboardStats {
  period: StatsPeriod;
  revenue: MetricWithSparkline;
  orders: MetricWithSparkline;
  aov: MetricWithSparkline;
  conversion: MetricWithSparkline;
  returning: MetricWithSparkline;
  pendingOrders: number;
  processingOrders: number;
  lowStockItems: number;
}

function periodDays(period: StatsPeriod): number {
  if (period === 'today') return 1;
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  return 90;
}

function getDateRange(
  period: StatsPeriod,
  shift = 0,
): { start: Date; end: Date } {
  const days = periodDays(period);
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - days * shift);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  // For "today" the end is now, start is start of today
  if (period === 'today' && shift === 0) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return { start: startOfToday, end: now };
  }
  if (period === 'today' && shift === 1) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    return { start: yesterday, end: yesterdayEnd };
  }
  return { start, end };
}

function calculateDelta(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 100);
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async getStats(orgId: string, period: StatsPeriod): Promise<DashboardStats> {
    const [revenue, orders, conversion, returning, snapshots] =
      await Promise.all([
        this.getRevenueStat(orgId, period),
        this.getOrdersStat(orgId, period),
        this.getConversionStat(orgId, period),
        this.getReturningCustomerStat(orgId, period),
        this.getSnapshotCounts(orgId),
      ]);

    const aov = this.computeAov(revenue, orders);

    return {
      period,
      revenue,
      orders,
      aov,
      conversion,
      returning,
      ...snapshots,
    };
  }

  private async getRevenueStat(
    orgId: string,
    period: StatsPeriod,
  ): Promise<MetricWithSparkline> {
    const days = periodDays(period);
    const { start, end } = getDateRange(period, 0);
    const { start: priorStart, end: priorEnd } = getDateRange(period, 1);

    const [currentRows, priorRows, sparklineRows] = await Promise.all([
      this.db.execute(sql`
        SELECT COALESCE(SUM(total), 0)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND status IN ('paid', 'processing', 'shipped', 'delivered')
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
      `),
      this.db.execute(sql`
        SELECT COALESCE(SUM(total), 0)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND status IN ('paid', 'processing', 'shipped', 'delivered')
          AND created_at >= ${priorStart.toISOString()}
          AND created_at < ${priorEnd.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          COALESCE(SUM(total), 0)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND status IN ('paid', 'processing', 'shipped', 'delivered')
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const current = Number((currentRows.rows[0] as { value: string }).value);
    const prior = Number((priorRows.rows[0] as { value: string }).value);
    const sparkline = this.buildSparkline(
      sparklineRows.rows as { day: Date; value: string }[],
      start,
      days,
    );

    return { current, prior, delta: calculateDelta(current, prior), sparkline };
  }

  private async getOrdersStat(
    orgId: string,
    period: StatsPeriod,
  ): Promise<MetricWithSparkline> {
    const days = periodDays(period);
    const { start, end } = getDateRange(period, 0);
    const { start: priorStart, end: priorEnd } = getDateRange(period, 1);

    const [currentRows, priorRows, sparklineRows] = await Promise.all([
      this.db.execute(sql`
        SELECT COUNT(*)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND created_at >= ${priorStart.toISOString()}
          AND created_at < ${priorEnd.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          COUNT(*)::bigint AS value
        FROM orders
        WHERE organization_id = ${orgId}
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const current = Number((currentRows.rows[0] as { value: string }).value);
    const prior = Number((priorRows.rows[0] as { value: string }).value);
    const sparkline = this.buildSparkline(
      sparklineRows.rows as { day: Date; value: string }[],
      start,
      days,
    );

    return { current, prior, delta: calculateDelta(current, prior), sparkline };
  }

  private computeAov(
    revenue: MetricWithSparkline,
    orders: MetricWithSparkline,
  ): MetricWithSparkline {
    const current =
      orders.current > 0 ? Math.round(revenue.current / orders.current) : 0;
    const prior =
      orders.prior > 0 ? Math.round(revenue.prior / orders.prior) : 0;

    // AOV sparkline: revenue[i] / orders[i] per day
    const sparkline = revenue.sparkline.map((rev, i) => {
      const ord = orders.sparkline[i] ?? 0;
      return ord > 0 ? Math.round(rev / ord) : 0;
    });

    return { current, prior, delta: calculateDelta(current, prior), sparkline };
  }

  private async getConversionStat(
    orgId: string,
    period: StatsPeriod,
  ): Promise<MetricWithSparkline> {
    const days = periodDays(period);
    const { start, end } = getDateRange(period, 0);
    const { start: priorStart, end: priorEnd } = getDateRange(period, 1);

    const [currentRows, priorRows, sparklineRows] = await Promise.all([
      this.db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'converted')::bigint AS converted,
          COUNT(*) FILTER (WHERE status IN ('converted', 'abandoned'))::bigint AS resolved
        FROM carts
        WHERE organization_id = ${orgId}
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'converted')::bigint AS converted,
          COUNT(*) FILTER (WHERE status IN ('converted', 'abandoned'))::bigint AS resolved
        FROM carts
        WHERE organization_id = ${orgId}
          AND created_at >= ${priorStart.toISOString()}
          AND created_at < ${priorEnd.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          COUNT(*) FILTER (WHERE status = 'converted')::bigint AS converted,
          COUNT(*) FILTER (WHERE status IN ('converted', 'abandoned'))::bigint AS resolved
        FROM carts
        WHERE organization_id = ${orgId}
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    type ConvRow = { converted: string; resolved: string };
    const cr = currentRows.rows[0] as ConvRow;
    const pr = priorRows.rows[0] as ConvRow;

    const convRate = (row: ConvRow): number => {
      const resolved = Number(row.resolved);
      if (resolved === 0) return 0;
      return Math.round((Number(row.converted) / resolved) * 100);
    };

    const current = convRate(cr);
    const prior = convRate(pr);

    type SparkRow = { day: Date; converted: string; resolved: string };
    const sparklineData = sparklineRows.rows as SparkRow[];
    const sparkline = this.buildSparklineFrom(
      sparklineData,
      start,
      days,
      (row: SparkRow) => convRate(row),
    );

    return { current, prior, delta: calculateDelta(current, prior), sparkline };
  }

  private async getReturningCustomerStat(
    orgId: string,
    period: StatsPeriod,
  ): Promise<MetricWithSparkline> {
    const days = periodDays(period);
    const { start, end } = getDateRange(period, 0);
    const { start: priorStart, end: priorEnd } = getDateRange(period, 1);

    const [currentRows, priorRows, sparklineRows] = await Promise.all([
      this.db.execute(sql`
        SELECT
          COUNT(*) AS total_with_customer,
          COUNT(*) FILTER (
            WHERE customer_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM orders o2
                WHERE o2.customer_id = orders.customer_id
                  AND o2.organization_id = orders.organization_id
                  AND o2.created_at < ${start.toISOString()}
              )
          ) AS returning_count
        FROM orders
        WHERE organization_id = ${orgId}
          AND customer_id IS NOT NULL
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          COUNT(*) AS total_with_customer,
          COUNT(*) FILTER (
            WHERE customer_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM orders o2
                WHERE o2.customer_id = orders.customer_id
                  AND o2.organization_id = orders.organization_id
                  AND o2.created_at < ${priorStart.toISOString()}
              )
          ) AS returning_count
        FROM orders
        WHERE organization_id = ${orgId}
          AND customer_id IS NOT NULL
          AND created_at >= ${priorStart.toISOString()}
          AND created_at < ${priorEnd.toISOString()}
      `),
      this.db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          COUNT(*) AS total_with_customer,
          COUNT(*) FILTER (
            WHERE customer_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM orders o2
                WHERE o2.customer_id = orders.customer_id
                  AND o2.organization_id = orders.organization_id
                  AND o2.created_at < ${start.toISOString()}
              )
          ) AS returning_count
        FROM orders
        WHERE organization_id = ${orgId}
          AND customer_id IS NOT NULL
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    type RetRow = { total_with_customer: string; returning_count: string };
    const retRate = (row: RetRow): number => {
      const total = Number(row.total_with_customer);
      if (total === 0) return 0;
      return Math.round((Number(row.returning_count) / total) * 100);
    };

    const cr = currentRows.rows[0] as RetRow;
    const pr = priorRows.rows[0] as RetRow;
    const current = retRate(cr);
    const prior = retRate(pr);

    type SparkRow = RetRow & { day: Date };
    const sparklineData = sparklineRows.rows as SparkRow[];
    const sparkline = this.buildSparklineFrom(
      sparklineData,
      start,
      days,
      (row: SparkRow) => retRate(row),
    );

    return { current, prior, delta: calculateDelta(current, prior), sparkline };
  }

  private async getSnapshotCounts(orgId: string): Promise<{
    pendingOrders: number;
    processingOrders: number;
    lowStockItems: number;
  }> {
    const [orderCounts, inventoryCounts] = await Promise.all([
      this.db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending,
          COUNT(*) FILTER (WHERE status = 'processing')::bigint AS processing
        FROM orders
        WHERE organization_id = ${orgId}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::bigint AS low_stock
        FROM inventory_items
        WHERE organization_id = ${orgId}
          AND (quantity - reserved) <= low_stock_threshold
      `),
    ]);

    type OrderRow = { pending: string; processing: string };
    const oc = orderCounts.rows[0] as OrderRow;

    return {
      pendingOrders: Number(oc.pending),
      processingOrders: Number(oc.processing),
      lowStockItems: Number(
        (inventoryCounts.rows[0] as { low_stock: string }).low_stock,
      ),
    };
  }

  private buildSparkline(
    rows: { day: Date; value: string }[],
    start: Date,
    days: number,
  ): number[] {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      map.set(key, Number(row.value));
    }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return map.get(key) ?? 0;
    });
  }

  private buildSparklineFrom<T extends { day: Date }>(
    rows: T[],
    start: Date,
    days: number,
    getValue: (row: T) => number,
  ): number[] {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      map.set(key, getValue(row));
    }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return map.get(key) ?? 0;
    });
  }
}
