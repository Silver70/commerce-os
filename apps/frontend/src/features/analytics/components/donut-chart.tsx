import { Cell, Pie, PieChart } from "recharts";
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

export type DonutSlice = { name: string; value: number; color: string };

/** Donut with an inline legend. Slices carry their own color. */
export function DonutChart({
  title,
  description,
  data,
  centerLabel,
  centerValue,
}: {
  title: string;
  description?: string;
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.color }]),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data for this period
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="relative">
              <ChartContainer config={config} className="aspect-square h-44">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent nameKey="name" hideLabel />}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={70}
                    strokeWidth={2}
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {centerValue ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums leading-none">
                    {centerValue}
                  </span>
                  {centerLabel ? (
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {centerLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <ul className="space-y-2 w-full sm:w-auto sm:min-w-[9rem]">
              {data.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ background: d.color }}
                    />
                    <span className="capitalize truncate">{d.name}</span>
                  </span>
                  <span className="font-medium tabular-nums shrink-0">
                    {d.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
