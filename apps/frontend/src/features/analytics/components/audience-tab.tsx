import { useSuspenseQuery } from "@tanstack/react-query";
import { UsersIcon, MonitorSmartphoneIcon, GlobeIcon } from "lucide-react";
import type { Period, AudienceAnalytics } from "~/types/api";
import { audienceAnalyticsQueryOptions } from "../queries";
import { num, CHART_PALETTE } from "../utils";
import { StatTile } from "./stat-tile";
import { DonutChart, type DonutSlice } from "./donut-chart";
import { BarChartCard } from "./bar-chart-card";
import { RankedBarList } from "./ranked-bar-list";

const REGION = new Intl.DisplayNames(["en"], { type: "region" });
function countryName(code: string): string {
  try {
    return REGION.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function AudienceTab({ period }: { period: Period }) {
  const data: AudienceAnalytics = useSuspenseQuery(
    audienceAnalyticsQueryOptions(period),
  ).data;

  const deviceSlices: DonutSlice[] = data.devices.map((d, i) => ({
    name: d.label,
    value: d.sessions,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const topDevice = data.devices[0]?.label ?? "—";
  const topCountry = data.countries[0]
    ? countryName(data.countries[0].countryCode)
    : "—";

  return (
    <div className="space-y-4">
      {data.totalSessions === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No audience data yet for this period. Device, browser, and country are
          derived server-side from tracked events — embed the tracker to
          populate them.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Sessions"
          value={num(data.totalSessions)}
          icon={UsersIcon}
          hint="Bots excluded"
        />
        <StatTile
          label="Top device"
          value={topDevice}
          icon={MonitorSmartphoneIcon}
        />
        <StatTile label="Top country" value={topCountry} icon={GlobeIcon} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title="Devices"
          description="Sessions by device type"
          data={deviceSlices}
          centerValue={num(data.totalSessions)}
          centerLabel="sessions"
        />
        <BarChartCard
          title="Browsers"
          description="Sessions by browser"
          valueLabel="Sessions"
          formatValue={num}
          maxLabel={12}
          data={data.browsers.map((b) => ({
            label: b.label,
            value: b.sessions,
          }))}
        />
        <BarChartCard
          title="Operating systems"
          description="Sessions by OS"
          valueLabel="Sessions"
          formatValue={num}
          maxLabel={12}
          data={data.operatingSystems.map((o) => ({
            label: o.label,
            value: o.sessions,
          }))}
        />
        <RankedBarList
          title="Countries"
          description="Sessions by country"
          emptyLabel="No geo data for this period"
          items={data.countries.map((c) => ({
            label: countryName(c.countryCode),
            sublabel: c.countryCode,
            value: num(c.sessions),
            weight: c.sessions,
          }))}
        />
      </div>
    </div>
  );
}
