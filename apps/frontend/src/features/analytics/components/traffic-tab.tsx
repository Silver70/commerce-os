import { useSuspenseQuery } from "@tanstack/react-query";
import { UsersIcon, ShoppingBagIcon, PercentIcon } from "lucide-react";
import type { Period, TrafficAnalytics } from "~/types/api";
import { trafficAnalyticsQueryOptions } from "../queries";
import { num } from "../utils";
import { StatTile } from "./stat-tile";
import { DonutChart, type DonutSlice } from "./donut-chart";
import { FunnelChart } from "./funnel-chart";

const CHANNEL_COLORS: Record<string, string> = {
  Direct: "hsl(215 16% 47%)",
  "Organic Search": "hsl(142 71% 45%)",
  Social: "hsl(262 83% 63%)",
  Paid: "hsl(217 91% 60%)",
  Campaign: "hsl(38 92% 50%)",
  Referral: "hsl(330 75% 55%)",
};

export function TrafficTab({ period }: { period: Period }) {
  const data: TrafficAnalytics = useSuspenseQuery(
    trafficAnalyticsQueryOptions(period),
  ).data;

  const sourceSlices: DonutSlice[] = data.sources.map((s) => ({
    name: s.channel,
    value: s.sessions,
    color: CHANNEL_COLORS[s.channel] ?? "hsl(215 16% 47%)",
  }));

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelChart
          title="Conversion funnel"
          description="Distinct sessions reaching each stage"
          stages={data.funnel}
        />
        <DonutChart
          title="Traffic sources"
          description="Sessions by first-touch channel"
          data={sourceSlices}
          centerValue={num(data.uniqueVisitors)}
          centerLabel="visitors"
        />
      </div>
    </div>
  );
}
