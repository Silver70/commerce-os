import { storeConfig } from "~/config/store.config";

/**
 * Format integer cents as a localized currency string via `Intl.NumberFormat`.
 *
 * Money is always stored and passed around as integer cents (the smallest
 * currency unit) — never as floats. Never do money math on the client; render
 * what the server returns. This is the only place the storefront turns cents
 * into a human-readable string.
 */
export function formatMoney(
  cents: number,
  currency: string = storeConfig.currency,
): string {
  return new Intl.NumberFormat(storeConfig.locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format a price range (e.g. a product's `minPrice`–`maxPrice`). Collapses to a
 * single value when both ends are equal.
 */
export function formatPriceRange(
  minCents: number,
  maxCents: number,
  currency: string = storeConfig.currency,
): string {
  if (minCents === maxCents) return formatMoney(minCents, currency);
  return `${formatMoney(minCents, currency)} – ${formatMoney(maxCents, currency)}`;
}
