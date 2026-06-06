import { formatPrice } from "~/lib/money";
import type { Product } from "~/types/api";
import { priceRange } from "../utils";

export function PriceDisplay({ product }: { product: Product }) {
  const range = priceRange(product.variants);
  if (range.min === range.max) {
    return (
      <span className="text-sm font-semibold tabular-nums">
        {formatPrice(range.min)}
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold tabular-nums">
      {formatPrice(range.min)}
      <span className="font-normal text-muted-foreground"> – </span>
      {formatPrice(range.max)}
    </span>
  );
}
