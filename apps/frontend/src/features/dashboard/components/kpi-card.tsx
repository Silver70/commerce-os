import * as React from "react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { fmt, fmtCount } from "../utils";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  format = "currency",
}: {
  label: string;
  value: number;
  delta: number;
  icon: React.ElementType;
  format?: "currency" | "number" | "percent";
}) {
  const positive = delta >= 0;
  const displayValue =
    format === "currency"
      ? fmt(value)
      : format === "percent"
        ? `${value}%`
        : fmtCount(value);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-muted shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate">
              {label}
            </span>
          </div>
          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {positive ? (
              <TrendingUpIcon className="h-3 w-3" />
            ) : (
              <TrendingDownIcon className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">
          {displayValue}
        </p>
      </CardContent>
    </Card>
  );
}
