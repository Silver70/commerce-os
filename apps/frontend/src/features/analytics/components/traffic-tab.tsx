import { useSuspenseQuery } from "@tanstack/react-query";
import {
  UsersIcon,
  ShoppingBagIcon,
  PercentIcon,
  SparklesIcon,
} from "lucide-react";
import type { Period, TrafficAnalytics } from "~/types/api";
import { trafficAnalyticsQueryOptions } from "../queries";
import { num } from "../utils";
import { StatTile } from "./stat-tile";
import { FunnelChart } from "./funnel-chart";
import { BarChartCard } from "./bar-chart-card";
import { RankedBarList } from "./ranked-bar-list";

export function TrafficTab({ period }: { period: Period }) {
  const data: TrafficAnalytics = useSuspenseQuery(
    trafficAnalyticsQueryOptions(period),
  ).data;

  const aiSessions =
    data.sources.find((s) => s.channel === "AI Assistant")?.sessions ?? 0;

  return (
    <div className="space-y-4">
      {data.uniqueVisitors === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No traffic events received yet for this period. Embed the tracker (
          <code>
            &lt;script src=&quot;…/ca.js&quot; data-key=&quot;…&quot;&gt;
          </code>
          ) or POST to <code>/api/events</code> with the store&apos;s
          <code> X-API-Key</code> to populate traffic sources and the funnel.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <StatTile
          label="AI assistant"
          value={num(aiSessions)}
          icon={SparklesIcon}
          hint="Sessions from ChatGPT, Perplexity, etc."
        />
      </div>

      <FunnelChart
        title="Conversion funnel"
        description="Distinct sessions reaching each stage"
        stages={data.funnel}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <RankedBarList
          title="Top referrers"
          description="Sessions by referring site"
          emptyLabel="No referred traffic for this period"
          items={data.topReferrers.map((r) => ({
            label: r.referrer,
            value: num(r.sessions),
            weight: r.sessions,
          }))}
        />
      </div>
    </div>
  );
}
