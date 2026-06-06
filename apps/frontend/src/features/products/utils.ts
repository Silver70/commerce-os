import type { ProductVariant } from "~/types/api";
import type { OptionGroup, VariantDraft } from "./types";

// Copy shown beneath the status selector on the product form.
export const STATUS_HINTS: Record<string, string> = {
  active: "Visible and purchasable in your storefront.",
  draft: "Hidden from the storefront. Still editable.",
  archived: "Hidden from the storefront and locked from edits.",
};

/** Parse a non-negative integer string; blank or invalid -> undefined. */
export function toIntOrUndefined(s: string): number | undefined {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? undefined : n;
}

/** Cartesian product of filled option groups -> blank variant drafts. */
export function generateVariantDrafts(options: OptionGroup[]): VariantDraft[] {
  const filled = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (filled.length === 0) return [];

  const combinations: string[][] = filled.reduce<string[][]>(
    (acc, opt) =>
      acc.length === 0
        ? opt.values.map((v) => [v])
        : acc.flatMap((combo) => opt.values.map((v) => [...combo, v])),
    [],
  );

  return combinations.map((combo, i) => ({
    id: `gen-${Date.now()}-${i}`,
    sku: "",
    name: combo.join(" / "),
    price: "",
    compareAt: "",
    cost: "",
    initialStock: "",
    weight: "",
    allowBackorder: false,
    active: true,
    optionValueIds: [],
  }));
}

/** Human-readable label for a saved variant: option values, else name/sku. */
export function variantLabel(v: ProductVariant): string {
  if (v.optionValues.length > 0) {
    return v.optionValues.map((ov) => ov.value).join(" / ");
  }
  return v.name ?? v.sku;
}

export type StockState = { dot: string; valueClass: string; label: string };

/**
 * Stock data lives in the inventory module, not the products API.
 * Show a neutral state until inventory is wired in (Phase 4).
 */
export function stockState(_v: ProductVariant): StockState {
  return {
    dot: "bg-muted-foreground/40",
    valueClass: "text-muted-foreground",
    label: "—",
  };
}

/** Min/max variant price (integer cents). Empty list -> { min: 0, max: 0 }. */
export function priceRange(variants: ProductVariant[]): {
  min: number;
  max: number;
} {
  if (variants.length === 0) return { min: 0, max: 0 };
  const prices = variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
