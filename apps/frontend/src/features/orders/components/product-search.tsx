import * as React from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { PRODUCT_CATALOG } from "../mock-catalog";
import type { CatalogProduct } from "../types";

export function ProductSearch({
  onAdd,
}: {
  onAdd: (p: CatalogProduct) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  const results =
    query.length > 0
      ? PRODUCT_CATALOG.filter(
          (p) =>
            p.product.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase()) ||
            p.variant.toLowerCase().includes(query.toLowerCase()),
        )
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
          {results.length > 0 ? (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => {
                  onAdd(p);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                <div
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-md bg-gradient-to-br",
                    p.gradient,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.variant && `${p.variant} · `}
                    <span className="font-mono">{p.sku}</span>
                    {" · "}
                    {p.stock > 0 ? (
                      `${p.stock} in stock`
                    ) : (
                      <span className="text-destructive">Out of stock</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  ${p.price.toFixed(2)}
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
