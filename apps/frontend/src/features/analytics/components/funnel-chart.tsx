import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { num } from "../utils";

export type FunnelStage = { stage: string; sessions: number };

type Tone = "default" | "positive" | "warn" | "accent";

function HeaderKpi({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string;
  unit: string;
  tone?: Tone;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-destructive"
        : tone === "accent"
          ? "text-[hsl(var(--chart-1))]"
          : "";
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-xl font-bold tabular-nums leading-tight ${toneClass}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}

/**
 * Horizontal conversion funnel with a smooth tapering silhouette + a summary
 * header (entered / completed / dropped / conversion). Stage heights are share
 * of the entered (first) stage; the per-step % is share of the *previous* stage.
 * Every ratio is guarded against divide-by-zero (never NaN).
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
  const n = stages.length;
  const entered = stages[0]?.sessions ?? 0;
  const completed = n > 0 ? stages[n - 1].sessions : 0;
  const dropped = Math.max(entered - completed, 0);
  const conversionPct =
    entered > 0 ? Math.round((completed / entered) * 1000) / 10 : 0;

  // ── SVG geometry ──────────────────────────────────────────────────────────
  const W = 1000;
  const H = 240;
  const usableH = H * 0.86;
  const colW = n > 0 ? W / n : W;
  const barH = (v: number) => (entered > 0 ? (v / entered) * usableH : 0);
  const nodeX = (i: number) => (i + 0.5) * colW;

  type Pt = { x: number; y: number };
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const addPoint = (x: number, v: number) => {
    const h = barH(v);
    top.push({ x, y: (H - h) / 2 });
    bot.push({ x, y: (H + h) / 2 });
  };
  // Flat caps at the left/right edges so the shape spans the full width.
  addPoint(0, stages[0]?.sessions ?? 0);
  stages.forEach((s, i) => addPoint(nodeX(i), s.sessions));
  addPoint(W, stages[n - 1]?.sessions ?? 0);

  // Smooth cubic-bezier through points, horizontal tangents at each node.
  const smooth = (pts: Pt[]): string => {
    let d = "";
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y} ${mx} ${p1.y} ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const path =
    `M ${top[0].x} ${top[0].y}` +
    smooth(top) +
    ` L ${bot[bot.length - 1].x} ${bot[bot.length - 1].y}` +
    smooth([...bot].reverse()) +
    " Z";

  const cols = `repeat(${n}, minmax(0, 1fr))`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {/* Summary header */}
        <div className="grid grid-cols-4 gap-2 border-b pb-3">
          <HeaderKpi label="Entered" value={num(entered)} unit="sessions" />
          <HeaderKpi
            label="Completed"
            value={num(completed)}
            unit="sessions"
            tone="positive"
          />
          <HeaderKpi
            label="Dropped"
            value={num(dropped)}
            unit="sessions"
            tone="warn"
          />
          <HeaderKpi
            label="Conversion"
            value={`${conversionPct}%`}
            unit="of entered"
            tone="accent"
          />
        </div>

        {entered === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No traffic events for this period
          </p>
        ) : (
          <div className="pt-4">
            {/* Stage labels */}
            <div className="grid" style={{ gridTemplateColumns: cols }}>
              {stages.map((s) => (
                <div key={s.stage} className="px-1 text-center">
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.stage}
                  </p>
                  <p className="text-lg font-bold leading-tight tabular-nums">
                    {num(s.sessions)}
                  </p>
                </div>
              ))}
            </div>

            {/* Funnel silhouette */}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="my-2 h-36 w-full"
              role="img"
              aria-label="Conversion funnel"
            >
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity="0.9"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity="0.5"
                  />
                </linearGradient>
              </defs>
              {stages.map((_, i) =>
                i > 0 ? (
                  <line
                    key={i}
                    x1={i * colW}
                    y1={0}
                    x2={i * colW}
                    y2={H}
                    stroke="var(--border)"
                    strokeDasharray="2 5"
                  />
                ) : null,
              )}
              <path d={path} fill="url(#funnelGrad)" />
            </svg>

            {/* Per-step conversion (share of previous stage) */}
            <div className="grid" style={{ gridTemplateColumns: cols }}>
              {stages.map((s, i) => {
                const prev = i > 0 ? stages[i - 1].sessions : s.sessions;
                const stepPct =
                  i === 0
                    ? 100
                    : prev > 0
                      ? Math.round((s.sessions / prev) * 100)
                      : 0;
                return (
                  <div key={s.stage} className="px-1 text-center">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        i > 0 && stepPct < 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stepPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
