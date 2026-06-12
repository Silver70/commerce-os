import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon, PackageIcon, SearchIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatPrice } from "~/lib/money";
import { Input } from "~/components/ui/input";
import { productsQueryOptions } from "~/features/products/queries";
import type { CatalogVariant } from "../types";

export function ProductSearch({
  onAdd,
}: {
  onAdd: (v: CatalogVariant) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  // Pull the catalog once and search client-side. Variants are flattened into
  // individually-purchasable rows. We fetch the full catalog (any status) so a
  // manual order can include draft products, not just published ones.
  const { data, isLoading, isError, error } = useQuery(
    productsQueryOptions({ limit: 100 }),
  );

  const variants = React.useMemo<CatalogVariant[]>(() => {
    const products = data?.items ?? [];
    return products.flatMap((p) => {
      const imageUrl =
        p.media.find((m) => m.isPrimary)?.url ?? p.media[0]?.url ?? null;
      return p.variants.map((v) => ({
        variantId: v.id,
        productName: p.name,
        variantName: v.name,
        sku: v.sku,
        unitPrice: v.price,
        imageUrl,
      }));
    });
  }, [data]);

  const results =
    query.length > 0
      ? variants
          .filter((v) => {
            const q = query.toLowerCase();
            return (
              v.productName.toLowerCase().includes(q) ||
              (v.sku?.toLowerCase().includes(q) ?? false) ||
              (v.variantName?.toLowerCase().includes(q) ?? false)
            );
          })
          .slice(0, 8)
      : [];

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="Search by name, SKU, or variant…"
        className="h-10 pl-9 text-sm"
      />

      {focused && query.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {isError ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-destructive">
                Couldn't load products.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
              Loading catalog…
            </div>
          ) : results.length > 0 ? (
            results.map((v) => (
              <button
                key={v.variantId}
                type="button"
                onMouseDown={() => {
                  onAdd(v);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                {v.imageUrl ? (
                  <img
                    src={v.imageUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <PackageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {v.productName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.variantName && `${v.variantName} · `}
                    <span className="font-mono">{v.sku ?? "—"}</span>
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatPrice(v.unitPrice)}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No products match "{query}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
