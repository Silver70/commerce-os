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
import { useListControls } from "~/lib/use-list-controls";
import { PAGE_SIZE, type Product, type ProductStatus } from "~/types/api";
import { productsQueryOptions } from "../queries";
import { PriceDisplay } from "../components/price-display";
import { ProductStatusBadge } from "../components/product-status-badge";
import { ProductThumbnail } from "../components/product-thumbnail";
import { primaryImage } from "../utils";

const COLUMNS: DataTableColumn<Product>[] = [
  {
    key: "product",
    header: "Product",
    render: (row) => {
      const variantCount = row.variants.length;
      const singleSku =
        variantCount === 1 ? (row.variants[0]?.sku ?? null) : null;
      const image = primaryImage(row.media);
      return (
        <div className="flex items-center gap-3">
          <ProductThumbnail
            name={row.name}
            imageUrl={image?.url}
            altText={image?.altText}
          />
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
  const list = useListControls();

  const { data } = useSuspenseQuery(
    productsQueryOptions({
      search: list.debouncedSearch || undefined,
      status: (list.filters.status as ProductStatus) || undefined,
      page: list.page,
      limit: PAGE_SIZE,
    }),
  );

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
            {data.totalCount > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({data.totalCount} total)
              </span>
            )}
          </p>
        </div>
      </div>

      <DataTable
        data={data.items}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        filterState={{ values: list.filters, onChange: list.setFilter }}
        search={{
          value: list.search,
          onChange: list.setSearch,
          placeholder: "Search name or SKU…",
          pending: list.pending,
        }}
        pagination={{
          page: list.page,
          pageSize: data.limit,
          totalCount: data.totalCount,
          totalPages: data.totalPages,
          onPageChange: list.goToPage,
        }}
        action={
          <Button className="gap-2 px-5 py-2.5" asChild>
            <Link to="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        }
        emptyMessage="No products match your filters."
      />
    </div>
  );
}
