import type { PriceList, PriceListStatus } from "~/types/api";

/** Derive a price list's effective status from its active flag and date window. */
export function computePriceListStatus(p: PriceList): PriceListStatus {
  const now = new Date();
  if (!p.isActive) return "expired";
  if (p.endsAt && new Date(p.endsAt) < now) return "expired";
  if (p.startsAt && new Date(p.startsAt) > now) return "scheduled";
  return "active";
}

/** Human label for the list type. */
export function formatType(p: PriceList): string {
  return p.type === "fixed" ? "Fixed prices" : "Adjustment";
}

/**
 * Display an adjustment list's effect: "15% off" / "20% markup".
 * Returns "—" for fixed lists.
 */
export function formatAdjustment(p: PriceList): string {
  if (p.type !== "adjustment" || p.adjustmentBasisPoints == null) return "—";
  const pct = Math.abs(p.adjustmentBasisPoints) / 100;
  const rounded = Number.isInteger(pct) ? pct : pct.toFixed(2);
  if (p.adjustmentBasisPoints < 0) return `${rounded}% off`;
  if (p.adjustmentBasisPoints > 0) return `${rounded}% markup`;
  return "No change";
}

/** Convert a signed percent (e.g. -15) to basis points (-1500). */
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

/** Convert signed basis points (-1500) to percent (-15). */
export function basisPointsToPercent(bps: number): number {
  return bps / 100;
}
