import type {
  Category,
  Product,
  ProductMediaItem,
  ProductVariant,
} from "~/types/api";
import type { OptionSelection } from "./types";

// ─── Categories ───────────────────────────────────────────────────────────────

/** Flatten a category tree (depth-first) into a single list. */
export function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(categories);
  return out;
}

/** Find a category anywhere in the tree by slug. */
export function findCategoryBySlug(
  categories: Category[],
  slug: string,
): Category | undefined {
  return flattenCategories(categories).find((c) => c.slug === slug);
}

// ─── Media ────────────────────────────────────────────────────────────────────

/** Order media for display: primary first, then by position. */
export function sortMedia(media: ProductMediaItem[]): ProductMediaItem[] {
  return [...media].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.position - b.position;
  });
}

/** The image to show in a product card: primary, else lowest position. */
export function primaryImage(
  media: ProductMediaItem[],
): ProductMediaItem | undefined {
  return sortMedia(media)[0];
}

// ─── Variants ─────────────────────────────────────────────────────────────────

/**
 * Resolve the active variant matching a selection. A variant matches when every
 * selected option-value id is present in the variant's option values. For a
 * product with no options this returns the single (first active) variant.
 */
export function resolveVariant(
  product: Product,
  selection: OptionSelection,
): ProductVariant | undefined {
  const wantedIds = Object.values(selection);
  return product.variants.find(
    (v) =>
      v.isActive &&
      wantedIds.every((id) => v.optionValues.some((ov) => ov.id === id)),
  );
}

/**
 * Whether choosing `valueId` for `optionId` (keeping the other current
 * selections) still yields at least one active variant. Used to grey out
 * impossible option combinations in the picker.
 */
export function isValueAvailable(
  product: Product,
  selection: OptionSelection,
  optionId: string,
  valueId: string,
): boolean {
  return product.variants.some(
    (v) =>
      v.isActive &&
      v.optionValues.some((ov) => ov.id === valueId) &&
      Object.entries(selection).every(
        ([oid, vid]) =>
          oid === optionId || v.optionValues.some((ov) => ov.id === vid),
      ),
  );
}

/**
 * Seed a selection from the first active variant so the picker always opens on a
 * real, purchasable combination.
 */
export function initialSelection(product: Product): OptionSelection {
  const base = product.variants.find((v) => v.isActive) ?? product.variants[0];
  const selection: OptionSelection = {};
  if (!base) return selection;
  for (const option of product.options) {
    const match = option.values.find((val) =>
      base.optionValues.some((ov) => ov.id === val.id),
    );
    if (match) selection[option.id] = match.id;
  }
  return selection;
}
