import * as React from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { Product } from "~/types/api";
import { formatMoney } from "~/lib/money";
import { Badge } from "~/components/ui/badge";
import { ProductGallery } from "../components/product-gallery";
import { VariantPicker } from "../components/variant-picker";
import { VariantSelect } from "../components/variant-select";
import { AddToCartButton } from "../components/add-to-cart-button";
import { productQueryOptions } from "../queries";
import { initialSelection, resolveVariant } from "../utils";
import type { OptionSelection } from "../types";

const route = getRouteApi("/products/$slug");

export function ProductDetailPage() {
  const { slug } = route.useParams();
  const { data: product } = useSuspenseQuery(productQueryOptions(slug));

  // The loader throws notFound() for a missing/inactive product; this guard
  // just satisfies the nullable query type.
  if (!product) return null;

  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const activeVariants = product.variants.filter((v) => v.isActive);

  // Use the structured option picker only when the product actually models
  // options AND its variants are linked to option values. Otherwise (variants
  // distinguished by name only — e.g. the demo seed) fall back to a simple
  // by-name variant selector so the variants are still selectable.
  const useStructuredOptions =
    product.options.length > 0 &&
    product.variants.some((v) => v.optionValues.length > 0);

  const [selection, setSelection] = React.useState<OptionSelection>(() =>
    initialSelection(product),
  );
  const [variantId, setVariantId] = React.useState<string | null>(
    () => activeVariants[0]?.id ?? null,
  );

  const handleSelect = (optionId: string, valueId: string) =>
    setSelection((prev) => ({ ...prev, [optionId]: valueId }));

  const selectedVariant = useStructuredOptions
    ? resolveVariant(product, selection)
    : activeVariants.find((v) => v.id === variantId);

  const displayPrice = selectedVariant?.price ?? product.minPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/products" search={{}} className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery media={product.media} alt={product.name} />

        <div className="space-y-6">
          <div className="space-y-2">
            {product.vendor && (
              <p className="text-sm text-muted-foreground">{product.vendor}</p>
            )}
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-xl font-medium">
                {formatMoney(displayPrice)}
              </span>
              {compareAt != null && compareAt > displayPrice && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(compareAt)}
                  </span>
                  <Badge variant="destructive">Sale</Badge>
                </>
              )}
            </div>
          </div>

          {useStructuredOptions ? (
            <VariantPicker
              product={product}
              selection={selection}
              onSelect={handleSelect}
            />
          ) : (
            <VariantSelect
              variants={product.variants}
              selectedId={variantId}
              onSelect={setVariantId}
            />
          )}

          {selectedVariant?.sku && (
            <p className="text-xs text-muted-foreground">
              SKU: {selectedVariant.sku}
            </p>
          )}

          <AddToCartButton variantId={selectedVariant?.id ?? null} />

          {product.description && (
            <div className="border-t pt-6">
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
