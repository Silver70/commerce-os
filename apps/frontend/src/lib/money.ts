export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  )
}

/** Plain dollar string with no thousands separators, e.g. 14999 -> "$149.99". */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Parse a dollar string into integer cents. Invalid or negative -> 0. */
export function toCents(dollars: string): number {
  const n = parseFloat(dollars)
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100)
}
