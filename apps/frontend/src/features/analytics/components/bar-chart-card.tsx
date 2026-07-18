import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

export type BarDatum = { label: string; value: number };

/**
 * shadcn/recharts vertical bar chart in a Card. Category label on the X axis,
 * one numeric series. Colour comes from the chart theme via `--color-value`.
 */
export function BarChartCard({
  title,
  description,
  data,
  valueLabel,
  formatValue,
  emptyLabel = "No data for this period",
  maxLabel = 12,
}: {
  title: string;
  description?: string;
  data: BarDatum[];
  valueLabel: string;
  formatValue: (v: number) => string;
  emptyLabel?: string;
  /** Truncate X-axis labels longer than this (full text stays in the tooltip). */
  maxLabel?: number;
}) {
  const config: ChartConfig = {
    value: { label: valueLabel, color: "hsl(var(--chart-1))" },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: string) =>
                  v.length > maxLabel ? `${v.slice(0, maxLabel - 1)}…` : v
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) => formatValue(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatValue(value as number)}
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={6} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
