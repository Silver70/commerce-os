import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";

/**
 * A plain metric tile — label, big value, optional hint line. Unlike the
 * dashboard's KpiCard it carries no period delta, since most analytics figures
 * (margin, refund rate, stock value) have no meaningful prior-period comparison
 * in this view.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  tone?: "default" | "warn" | "positive";
}) {
  const valueTone =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "positive"
        ? "text-emerald-600 dark:text-emerald-400"
        : "";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {Icon ? (
            <div className="p-1.5 rounded-md bg-muted shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ) : null}
          <span className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <p
          className={`text-2xl font-bold tracking-tight tabular-nums leading-none ${valueTone}`}
        >
          {value}
        </p>
        {hint ? (
          <p className="text-xs text-muted-foreground mt-2">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
