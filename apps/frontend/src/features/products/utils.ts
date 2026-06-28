import type { ProductMedia, ProductVariant } from "~/types/api";
import type { OptionGroup, VariantDraft } from "./types";

/**
 * The image that best represents a product: its primary image, else the first
 * image by position. Returns null when the product has no image media.
 */
export function primaryImage(media: ProductMedia[]): ProductMedia | null {
  const images = media.filter((m) => m.mediaType === "image");
  if (images.length === 0) return null;
  return (
    images.find((m) => m.isPrimary) ??
    [...images].sort((a, b) => a.position - b.position)[0]
  );
}

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

/** Acronym for the product title, e.g. "Wave Board Pro" -> "WBP". */
function skuTitleCode(title: string): string {
  const words = title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3);
  return words.map((w) => w[0]).join("");
}

/** Compact code for an option value, e.g. "Large" -> "LAR". */
function skuValueCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

/**
 * Build a compact SKU from the product title acronym + per-value codes,
 * e.g. "Wave Board Pro" + ["Large", "Red"] -> "WBP-LAR-RED". With no option
 * values the variant is numbered sequentially (WBP-01, WBP-02…). `seen` tracks
 * SKUs already emitted in this batch so each stays unique.
 */
export function buildVariantSku(
  productTitle: string,
  values: string[],
  seen: Set<string>,
): string {
  const code = skuTitleCode(productTitle) || "SKU";
  const valueCodes = values.map(skuValueCode).filter(Boolean);

  let sku: string;
  if (valueCodes.length > 0) {
    sku = [code, ...valueCodes].join("-");
    if (seen.has(sku)) {
      let n = 2;
      while (seen.has(`${sku}-${n}`)) n++;
      sku = `${sku}-${n}`;
    }
  } else {
    let n = 1;
    while (seen.has(`${code}-${String(n).padStart(2, "0")}`)) n++;
    sku = `${code}-${String(n).padStart(2, "0")}`;
  }
  seen.add(sku);
  return sku;
}

/** Cartesian product of filled option groups -> variant drafts w/ auto SKUs. */
export function generateVariantDrafts(
  options: OptionGroup[],
  productTitle = "",
): VariantDraft[] {
  const filled = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (filled.length === 0) return [];

  const combinations: string[][] = filled.reduce<string[][]>(
    (acc, opt) =>
      acc.length === 0
        ? opt.values.map((v) => [v])
        : acc.flatMap((combo) => opt.values.map((v) => [...combo, v])),
    [],
  );

  const seen = new Set<string>();
  return combinations.map((combo, i) => ({
    id: `gen-${Date.now()}-${i}`,
    sku: buildVariantSku(productTitle, combo, seen),
    name: combo.join(" / "),
    price: "",
    compareAt: "",
    cost: "",
    initialStock: "",
    weight: "",
    allowBackorder: false,
    active: true,
    optionValueIds: [],
    // combo[k] is the chosen value of the k-th filled option, in order.
    optionValues: filled.map((opt, k) => ({
      option: opt.name,
      value: combo[k],
    })),
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
