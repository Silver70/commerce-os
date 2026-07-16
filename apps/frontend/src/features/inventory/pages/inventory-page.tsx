import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable, type DataTableColumn } from "~/components/data-table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useListControls } from "~/lib/use-list-controls";
import { PAGE_SIZE, type InventoryItemView } from "~/types/api";
import { inventoryQueryOptions } from "../queries";
import { AvailableCell } from "../components/available-cell";
import { StockAdjustSheet } from "../components/stock-adjust-sheet";

export function InventoryPage() {
  const list = useListControls();
  const [adjustItem, setAdjustItem] = React.useState<InventoryItemView | null>(
    null,
  );

  // The tab IS the server-side stock filter — it can't be a client-side filter
  // over the loaded page, which would only ever search the visible 25 rows.
  const activeTab = (list.filters.status ?? "all") as "all" | "low" | "out";

  const data = useSuspenseQuery(
    inventoryQueryOptions({
      status: activeTab === "all" ? undefined : activeTab,
      search: list.debouncedSearch || undefined,
      page: list.page,
      limit: PAGE_SIZE,
    }),
  ).data;

  const { low: lowStockCount, out: outStockCount } = data.counts;

  const openAdjust = React.useCallback((item: InventoryItemView) => {
    setAdjustItem(item);
  }, []);

  const columns: DataTableColumn<InventoryItemView>[] = React.useMemo(
    () => [
      {
        key: "product",
        header: "Product",
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {row.productName}
              {row.variantName && (
                <span className="text-muted-foreground">
                  {" · "}
                  {row.variantName}
                </span>
              )}
            </span>
            <span className="font-mono text-xs tracking-wide text-muted-foreground">
              {row.sku}
            </span>
          </div>
        ),
      },
      {
        key: "available",
        header: "Available",
        align: "center",
        className: "w-28",
        render: (row) => <AvailableCell item={row} />,
      },
      {
        key: "reserved",
        header: "Reserved",
        align: "center",
        className: "w-24",
        render: (row) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.reserved === 0 ? "—" : row.reserved}
          </span>
        ),
      },
      {
        key: "onHand",
        header: "On Hand",
        align: "center",
        className: "w-24",
        render: (row) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.quantity}
          </span>
        ),
      },
      {
        key: "adjust",
        header: "",
        align: "right",
        className: "w-28",
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => openAdjust(row)}
          >
            <SlidersHorizontalIcon className="h-3 w-3" />
            Adjust
          </Button>
        ),
      },
    ],
    [openAdjust],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage stock levels across all your products.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          list.setFilter("status", v === "all" ? null : v)
        }
      >
        <TabsList>
          <TabsTrigger value="all">All SKUs</TabsTrigger>
          <TabsTrigger value="low" className="gap-1.5">
            Low Stock
            {lowStockCount > 0 && (
              <Badge
                variant="outline"
                className="h-4 px-1.5 py-0 text-[10px] font-medium border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
              >
                {lowStockCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="out" className="gap-1.5">
            Out of Stock
            {outStockCount > 0 && (
              <Badge
                variant="outline"
                className="h-4 px-1.5 py-0 text-[10px] font-medium border-destructive/20 bg-destructive/10 text-destructive"
              >
                {outStockCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={data.items}
        columns={columns}
        rowKey={(row) => row.id}
        search={{
          value: list.search,
          onChange: list.setSearch,
          placeholder: "Search product or SKU…",
          pending: list.pending,
        }}
        pagination={{
          page: list.page,
          pageSize: data.limit,
          totalCount: data.totalCount,
          totalPages: data.totalPages,
          onPageChange: list.goToPage,
        }}
        emptyMessage="No inventory items match this filter."
      />

      <StockAdjustSheet item={adjustItem} onClose={() => setAdjustItem(null)} />
    </div>
  );
}
