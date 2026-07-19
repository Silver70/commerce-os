/** Compact currency from integer cents: $1.2M / $3.4k / $999.00. */
export function money(cents: number): string {
  const n = cents / 100;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact count: 1.2M / 3.4k / 999. */
export function num(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Distinct donut/legend colors — chart-1 plus a fixed light/dark-safe set. */
export const CHART_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(217 91% 60%)",
  "hsl(160 84% 39%)",
  "hsl(35 92% 55%)",
  "hsl(280 65% 60%)",
  "hsl(0 72% 60%)",
];
