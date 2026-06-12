import * as React from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PriceListPrice, Product } from "~/types/api";
import { productsQueryOptions } from "~/features/products/queries";
import { priceListQueryOptions } from "../queries";
import {
  deletePriceListPriceServerFn,
  setPriceListPricesServerFn,
} from "../server";

type VariantRow = {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  basePrice: number;
};

function flattenVariants(products: Product[]): VariantRow[] {
  const rows: VariantRow[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      rows.push({
        variantId: v.id,
        productName: p.name,
        variantLabel: v.name ?? "Default",
        sku: v.sku,
        basePrice: v.price,
      });
    }
  }
  return rows;
}

export function PriceEditor({
  priceListId,
  prices,
}: {
  priceListId: string;
  prices: PriceListPrice[];
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const productsQuery = useQuery(productsQueryOptions({ status: "active" }));
  const products = productsQuery.data?.items ?? [];
  const variants = React.useMemo(() => flattenVariants(products), [products]);

  // existing price-list rows keyed by variant (cents)
  const existing = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const row of prices) m.set(row.variantId, row.price);
    return m;
  }, [prices]);

  // local edits: variantId → dollar string
  const [edits, setEdits] = React.useState<Record<string, string>>({});

  const filtered = variants.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return existing.has(v.variantId); // show priced variants by default
    return (
      v.productName.toLowerCase().includes(q) ||
      v.variantLabel.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q)
    );
  });

  function displayValue(v: VariantRow): string {
    if (edits[v.variantId] !== undefined) return edits[v.variantId];
    const cents = existing.get(v.variantId);
    return cents != null ? (cents / 100).toFixed(2) : "";
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(edits)
        .map(([variantId, raw]) => ({
          variantId,
          price: Math.round(parseFloat(raw) * 100),
        }))
        .filter((e) => Number.isFinite(e.price) && e.price >= 0);
      if (entries.length === 0) return;
      await setPriceListPricesServerFn({
        data: { priceListId, prices: entries },
      });
    },
    onSuccess: () => {
      setEdits({});
      queryClient.invalidateQueries({
        queryKey: priceListQueryOptions(priceListId).queryKey,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) =>
      deletePriceListPriceServerFn({ data: { priceListId, variantId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: priceListQueryOptions(priceListId).queryKey,
      });
    },
  });

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Variant Prices
        </CardTitle>
        <Button
          size="sm"
          disabled={!hasEdits || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Save prices"
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products to add prices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {productsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading products…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No matching variants."
              : "Search for products to set custom prices."}
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {filtered.map((v) => {
              const isPriced = existing.has(v.variantId);
              return (
                <div
                  key={v.variantId}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-none">
                      {v.productName}
                      <span className="text-muted-foreground">
                        {" · "}
                        {v.variantLabel}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.sku} · base ${(v.basePrice / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={(v.basePrice / 100).toFixed(2)}
                      value={displayValue(v)}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [v.variantId]: e.target.value,
                        }))
                      }
                      className="w-24"
                    />
                  </div>
                  {isPriced && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(v.variantId)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
