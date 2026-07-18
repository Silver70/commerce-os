import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ShoppingCartIcon,
  XCircleIcon,
  RotateCcwIcon,
  DollarSignIcon,
} from "lucide-react";
import type { Period, OrdersAnalytics, OrderStatus } from "~/types/api";
import { ordersAnalyticsQueryOptions } from "../queries";
import { money } from "../utils";
import { StatTile } from "./stat-tile";
import { DonutChart, type DonutSlice } from "./donut-chart";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "hsl(215 16% 47%)",
  paid: "hsl(217 91% 60%)",
  processing: "hsl(38 92% 50%)",
  shipped: "hsl(262 83% 63%)",
  delivered: "hsl(142 71% 45%)",
  refunded: "hsl(0 72% 51%)",
  cancelled: "hsl(0 63% 40%)",
};

export function OrdersTab({ period }: { period: Period }) {
  const data: OrdersAnalytics = useSuspenseQuery(
    ordersAnalyticsQueryOptions(period),
  ).data;

  const totalOrders = data.statusBreakdown.reduce((s, r) => s + r.count, 0);
  const statusSlices: DonutSlice[] = data.statusBreakdown.map((r) => ({
    name: r.status,
    value: r.count,
    color: STATUS_COLORS[r.status] ?? "hsl(215 16% 47%)",
  }));

  const paymentSlices: DonutSlice[] = [
    { name: "captured", value: data.payments.captured, color: "hsl(142 71% 45%)" },
    { name: "failed", value: data.payments.failed, color: "hsl(0 72% 51%)" },
    { name: "pending", value: data.payments.pending, color: "hsl(38 92% 50%)" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Cart abandonment"
          value={`${data.cartAbandonment.abandonmentRatePct}%`}
          icon={XCircleIcon}
          tone="warn"
          hint={`${data.cartAbandonment.abandonedCount} abandoned · ${data.cartAbandonment.convertedCount} converted`}
        />
        <StatTile
          label="Lost cart value"
          value={money(data.cartAbandonment.lostValue)}
          icon={ShoppingCartIcon}
          hint="Total of abandoned carts"
        />
        <StatTile
          label="Refund rate"
          value={`${data.refunds.refundRatePct}%`}
          icon={RotateCcwIcon}
          tone={data.refunds.refundRatePct > 0 ? "warn" : "default"}
          hint={`${data.refunds.count} refunds`}
        />
        <StatTile
          label="Refunded"
          value={money(data.refunds.amount)}
          icon={DollarSignIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title="Orders by status"
          description="All orders created this period"
          data={statusSlices}
          centerValue={String(totalOrders)}
          centerLabel="orders"
        />
        <DonutChart
          title="Payments"
          description="Capture success vs. failure"
          data={paymentSlices}
          centerValue={`${data.payments.successRatePct}%`}
          centerLabel="success"
        />
      </div>
    </div>
  );
}
