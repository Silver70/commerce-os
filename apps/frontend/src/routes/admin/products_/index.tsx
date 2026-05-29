import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, EyeIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "~/components/data-table";
import { productsQueryOptions } from "~/queries/products";
import { getProductsServerFn } from "~/server/products";
import type { Product, ProductStatus } from "~/types/api"

export type { ProductStatus };

export const Route = createFileRoute("/admin/products_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(productsQueryOptions()),
  component: ProductsPage,
});

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Electronics: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
  },
  Apparel: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
  },
  Footwear: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  Accessories: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  "Home & Living": {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  Sports: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-600 dark:text-orange-400",
  },
  Beauty: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    text: "text-pink-600 dark:text-pink-400",
  },
};

export function ProductThumbnail({ name }: { name: string }) {
  const colors = { bg: "bg-muted", text: "text-muted-foreground" };
  return (
    <div
      className={`flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg border border-border/50 ${colors.bg}`}
    >
      <span className={`text-sm font-bold ${colors.text}`}>{name[0]}</span>
    </div>
  );
}

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function priceRange(product: Product): { min: number; max: number } {
  if (product.variants.length === 0) return { min: 0, max: 0 };
  const prices = product.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function PriceDisplay({ product }: { product: Product }) {
  const range = priceRange(product);
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<ProductStatus, string> = {
  active:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  draft: "text-muted-foreground border-border bg-muted/40",
  archived: "text-destructive border-destructive/20 bg-destructive/10",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium capitalize px-2 py-0 ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: DataTableColumn<Product>[] = [
  {
    key: "product",
    header: "Product",
    render: (row) => {
      const variantCount = row.variants.length;
      const singleSku =
        variantCount === 1 ? (row.variants[0]?.sku ?? null) : null;
      return (
        <div className="flex items-center gap-3">
          <ProductThumbnail name={row.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">{row.name}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {singleSku ??
                `${variantCount} variant${variantCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <ProductStatusBadge status={row.status} />,
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    className: "w-36",
    render: (row) => <PriceDisplay product={row} />,
  },
  {
    key: "view",
    header: "View details",
    align: "center",
    className: "w-28 pl-8",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/products/$productId" params={{ productId: row.id }}>
          <EyeIcon className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];

// ─── Filters ──────────────────────────────────────────────────────────────────

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: page } = useSuspenseQuery(productsQueryOptions());
  const [items, setItems] = React.useState<Product[]>(page.items);
  const [nextCursor, setNextCursor] = React.useState<string | null>(
    page.nextCursor,
  );
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setItems(page.items);
    setNextCursor(page.nextCursor);
  }, [page]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await getProductsServerFn({ data: { cursor: nextCursor } });
      setItems((prev) => [...prev, ...more.items]);
      setNextCursor(more.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  // Invalidate on mount so store switching forces a fresh fetch
  React.useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog, pricing, and availability.
            {page.totalCount > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({page.totalCount} total)
              </span>
            )}
          </p>
        </div>
      </div>

      <DataTable
        data={items}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={25}
        action={
          <Button
            className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
            asChild
          >
            <Link to="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        }
        emptyMessage="No products match your filters."
      />

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
