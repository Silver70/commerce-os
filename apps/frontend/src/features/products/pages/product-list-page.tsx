import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { EyeIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "~/components/data-table";
import type { Product } from "~/types/api";
import { productsQueryOptions } from "../queries";
import { getProductsServerFn } from "../server";
import { PriceDisplay } from "../components/price-display";
import { ProductStatusBadge } from "../components/product-status-badge";
import { ProductThumbnail } from "../components/product-thumbnail";

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

export function ProductListPage() {
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
