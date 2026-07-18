import { useSuspenseQuery } from "@tanstack/react-query";
import { UsersIcon, ShoppingBagIcon, PercentIcon } from "lucide-react";
import type { Period, TrafficAnalytics } from "~/types/api";
import { trafficAnalyticsQueryOptions } from "../queries";
import { num } from "../utils";
import { StatTile } from "./stat-tile";
import { FunnelChart } from "./funnel-chart";
import { BarChartCard } from "./bar-chart-card";

export function TrafficTab({ period }: { period: Period }) {
  const data: TrafficAnalytics = useSuspenseQuery(
    trafficAnalyticsQueryOptions(period),
  ).data;

  return (
    <div className="space-y-4">
      {data.uniqueVisitors === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No traffic events received yet for this period. Point a storefront at
          the ingest API (<code>POST /api/events</code> with the store&apos;s
          <code> X-API-Key</code>) to populate traffic sources and the
          conversion funnel.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Unique visitors"
          value={num(data.uniqueVisitors)}
          icon={UsersIcon}
        />
        <StatTile
          label="Orders"
          value={num(data.orders)}
          icon={ShoppingBagIcon}
        />
        <StatTile
          label="Conversion rate"
          value={`${data.trueConversionRatePct}%`}
          icon={PercentIcon}
          tone="positive"
          hint="Orders ÷ unique visitors"
        />
      </div>

      <FunnelChart
        title="Conversion funnel"
        description="Distinct sessions reaching each stage"
        stages={data.funnel}
      />

      <BarChartCard
        title="Traffic sources"
        description="Sessions by first-touch channel"
        valueLabel="Sessions"
        formatValue={num}
        maxLabel={16}
        emptyLabel="No traffic events for this period"
        data={data.sources.map((s) => ({
          label: s.channel,
          value: s.sessions,
        }))}
      />
    </div>
  );
}
