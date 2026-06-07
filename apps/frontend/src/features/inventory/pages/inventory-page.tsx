import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable, type DataTableColumn } from "~/components/data-table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { InventoryItem } from "~/types/api";
import { inventoryQueryOptions } from "../queries";
import { stockStatus } from "../utils";
import { AvailableCell } from "../components/available-cell";
import { StockAdjustSheet } from "../components/stock-adjust-sheet";

export function InventoryPage() {
  const allItems: InventoryItem[] = useSuspenseQuery(
    inventoryQueryOptions(),
  ).data;
  const lowItems: InventoryItem[] = useSuspenseQuery(
    inventoryQueryOptions({ lowStock: true }),
  ).data;

  const [activeTab, setActiveTab] = React.useState<"all" | "low" | "out">("all");
  const [adjustItem, setAdjustItem] = React.useState<InventoryItem | null>(null);

  const outItems = allItems.filter((i) => stockStatus(i) === "out");

  const lowStockCount = lowItems.length;
  const outStockCount = outItems.length;

  const filteredData = React.useMemo(() => {
    if (activeTab === "low") return lowItems;
    if (activeTab === "out") return outItems;
    return allItems;
  }, [activeTab, allItems, lowItems, outItems]);

  const openAdjust = React.useCallback((item: InventoryItem) => {
    setAdjustItem(item);
  }, []);

  const columns: DataTableColumn<InventoryItem>[] = React.useMemo(
    () => [
      {
        key: "variantId",
        header: "Variant ID",
        className: "w-44",
        render: (row) => (
          <span className="font-mono text-sm font-medium tracking-wide text-muted-foreground">
            {row.variantId.slice(0, 8)}…
          </span>
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
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
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
        data={filteredData}
        columns={columns}
        rowKey={(row) => row.id}
        pageSize={25}
        emptyMessage="No inventory items match this filter."
      />

      <StockAdjustSheet item={adjustItem} onClose={() => setAdjustItem(null)} />
    </div>
  );
}
