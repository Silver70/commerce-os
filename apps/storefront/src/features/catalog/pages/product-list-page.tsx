import * as React from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Product, ProductFilter } from "~/types/api";
import { Button } from "~/components/ui/button";
import { CategoryFilter } from "../components/category-filter";
import { ProductGrid } from "../components/product-grid";
import { categoriesQueryOptions, productsQueryOptions } from "../queries";
import { getProductsServerFn } from "../server";
import { findCategoryBySlug } from "../utils";

const route = getRouteApi("/products/");
const PAGE_SIZE = 24;

export function ProductListPage() {
  const { category } = route.useSearch();
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const activeCategory = category
    ? findCategoryBySlug(categories, category)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        {activeCategory?.name ?? "All products"}
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CategoryFilter categories={categories} activeSlug={category} />
        </aside>

        {/* Keyed by category so the accumulated "load more" state resets on
            category change (and reseeds from the new suspense page). */}
        <ProductResults
          key={category ?? "all"}
          categoryId={activeCategory?.id}
        />
      </div>
    </div>
  );
}

function ProductResults({ categoryId }: { categoryId?: string }) {
  const filter: ProductFilter | undefined = categoryId
    ? { categoryId }
    : undefined;
  const { data: page } = useSuspenseQuery(
    productsQueryOptions({ filter, first: PAGE_SIZE }),
  );

  const [items, setItems] = React.useState<Product[]>(() =>
    page.edges.map((edge) => edge.node),
  );
  const [pageInfo, setPageInfo] = React.useState(page.pageInfo);
  const [loading, setLoading] = React.useState(false);

  async function loadMore() {
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) return;
    setLoading(true);
    try {
      const next = await getProductsServerFn({
        data: { filter, first: PAGE_SIZE, after: pageInfo.endCursor },
      });
      setItems((prev) => [...prev, ...next.edges.map((edge) => edge.node)]);
      setPageInfo(next.pageInfo);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No products found.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <ProductGrid products={items} />
      {pageInfo.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
