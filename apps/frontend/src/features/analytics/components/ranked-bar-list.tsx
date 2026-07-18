import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export type RankedItem = {
  label: string;
  sublabel?: string;
  value: string;
  /** Raw magnitude used to size the bar (e.g. revenue in cents). */
  weight: number;
};

/**
 * Horizontal ranked bar list — labelled rows with a proportional bar. Reads
 * better than a bare bar chart for named rankings (top products, categories)
 * because each bar keeps its label and formatted value inline.
 */
export function RankedBarList({
  title,
  description,
  items,
  emptyLabel = "No data for this period",
}: {
  title: string;
  description?: string;
  items: RankedItem[];
  emptyLabel?: string;
}) {
  const max = items.reduce((m, i) => Math.max(m, i.weight), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={`${item.label}-${i}`} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm truncate">
                    {item.label}
                    {item.sublabel ? (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {item.sublabel}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {item.value}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--chart-1))]"
                    style={{
                      width: `${max > 0 ? Math.max((item.weight / max) * 100, 2) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
