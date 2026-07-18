import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { num } from "../utils";

export type FunnelStage = { stage: string; sessions: number };

/**
 * Vertical conversion funnel. Bar width is each stage's share of the top stage
 * (visitors); the right-hand figure shows step conversion from the stage above,
 * making drop-off obvious.
 */
export function FunnelChart({
  title,
  description,
  stages,
}: {
  title: string;
  description?: string;
  stages: FunnelStage[];
}) {
  const top = stages[0]?.sessions ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {top === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No traffic events for this period
          </p>
        ) : (
          <ul className="space-y-3">
            {stages.map((s, i) => {
              const prev = i > 0 ? stages[i - 1].sessions : s.sessions;
              const stepPct =
                i > 0 && prev > 0 ? Math.round((s.sessions / prev) * 100) : 100;
              const widthPct = top > 0 ? (s.sessions / top) * 100 : 0;
              return (
                <li key={s.stage}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-sm">{s.stage}</span>
                    <span className="text-sm tabular-nums">
                      <span className="font-semibold">{num(s.sessions)}</span>
                      {i > 0 ? (
                        <span
                          className={`ml-2 text-xs ${
                            stepPct < 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stepPct}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-md bg-[hsl(var(--chart-1))] transition-all"
                      style={{ width: `${Math.max(widthPct, 1.5)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
