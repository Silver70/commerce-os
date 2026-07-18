import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { UsersIcon, UserPlusIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import type { Period, CustomersAnalytics } from "~/types/api";
import { customersAnalyticsQueryOptions } from "../queries";
import { num } from "../utils";
import { StatTile } from "./stat-tile";
import { DonutChart, type DonutSlice } from "./donut-chart";

const growthConfig: ChartConfig = {
  count: { label: "New customers", color: "hsl(var(--chart-1))" },
};

export function CustomersTab({ period }: { period: Period }) {
  const data: CustomersAnalytics = useSuspenseQuery(
    customersAnalyticsQueryOptions(period),
  ).data;

  const growth = data.growth.map((g) => ({
    date: new Date(g.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: g.count,
  }));

  const splitSlices: DonutSlice[] = [
    {
      name: "new",
      value: data.newVsReturning.newCustomers,
      color: "hsl(var(--chart-1))",
    },
    {
      name: "returning",
      value: data.newVsReturning.returning,
      color: "hsl(217 91% 60%)",
    },
  ];
  const splitTotal =
    data.newVsReturning.newCustomers + data.newVsReturning.returning;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Total customers"
          value={num(data.totalCustomers)}
          icon={UsersIcon}
          hint="Across the organization"
        />
        <StatTile
          label="New this period"
          value={num(data.newInPeriod)}
          icon={UserPlusIcon}
          tone="positive"
        />
        <StatTile
          label="Returning order share"
          value={
            splitTotal > 0
              ? `${Math.round((data.newVsReturning.returning / splitTotal) * 100)}%`
              : "0%"
          }
          icon={UsersIcon}
          hint={`${data.newVsReturning.returning} of ${splitTotal} orders`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              New customers
            </CardTitle>
            <CardDescription className="text-xs">
              Sign-ups per day this period
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={growthConfig} className="h-56 w-full">
              <AreaChart
                data={growth}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <defs>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#custGrad)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <DonutChart
          title="New vs. returning"
          description="Orders placed this period"
          data={splitSlices}
          centerValue={String(splitTotal)}
          centerLabel="orders"
        />
      </div>
    </div>
  );
}
