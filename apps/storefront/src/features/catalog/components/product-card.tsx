import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import type { Product } from "~/types/api";
import { formatPriceRange } from "~/lib/money";
import { primaryImage } from "../utils";

/** Grid tile linking to the product detail page. Image, vendor, name, price. */
export function ProductCard({ product }: { product: Product }) {
  const image = primaryImage(product.media);

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {product.vendor && (
          <p className="text-xs text-muted-foreground">{product.vendor}</p>
        )}
        <h3 className="text-sm leading-snug font-medium">{product.name}</h3>
        <p className="text-sm text-muted-foreground">
          {formatPriceRange(product.minPrice, product.maxPrice)}
        </p>
      </div>
    </Link>
  );
}
