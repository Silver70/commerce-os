import { useSuspenseQuery } from "@tanstack/react-query";
import { DollarSignIcon, TrendingUpIcon, PercentIcon } from "lucide-react";
import type { Period, SalesAnalytics } from "~/types/api";
import { salesAnalyticsQueryOptions } from "../queries";
import { money, num } from "../utils";
import { StatTile } from "./stat-tile";
import { RankedBarList } from "./ranked-bar-list";

export function SalesTab({ period }: { period: Period }) {
  const data: SalesAnalytics = useSuspenseQuery(
    salesAnalyticsQueryOptions(period),
  ).data;
  const { profit } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Revenue"
          value={money(profit.revenue)}
          icon={DollarSignIcon}
        />
        <StatTile
          label="Gross Profit"
          value={money(profit.grossProfit)}
          icon={TrendingUpIcon}
          tone="positive"
          hint={`${profit.coveragePct}% of revenue has cost data`}
        />
        <StatTile
          label="Margin"
          value={`${profit.marginPct}%`}
          icon={PercentIcon}
          hint="On items with a known cost"
        />
        <StatTile
          label="Cost of Goods"
          value={money(profit.cost)}
          icon={DollarSignIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedBarList
          title="Top products"
          description="By revenue this period"
          items={data.topProducts.map((p) => ({
            label: p.productName,
            sublabel: `${num(p.quantity)} sold`,
            value: money(p.revenue),
            weight: p.revenue,
          }))}
        />
        <RankedBarList
          title="Sales by category"
          description="Live category attribution"
          items={data.salesByCategory.map((c) => ({
            label: c.categoryName,
            sublabel: `${num(c.quantity)} sold`,
            value: money(c.revenue),
            weight: c.revenue,
          }))}
        />
      </div>

      <RankedBarList
        title="Coupon effectiveness"
        description="Discount given vs. revenue, by code"
        emptyLabel="No coupons redeemed this period"
        items={data.discounts.map((d) => ({
          label: d.couponCode,
          sublabel: `${num(d.orders)} orders · ${money(d.revenue)} revenue`,
          value: `-${money(d.discountTotal)}`,
          weight: d.discountTotal,
        }))}
      />
    </div>
  );
}
