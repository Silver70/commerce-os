import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangleIcon, MinusIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { DataTable, type DataTableColumn } from "~/components/data-table"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { inventoryQueryOptions } from "~/queries/inventory"
import { adjustInventoryServerFn } from "~/server/inventory"
import type { InventoryItem, StockStatus } from "~/types/api"

export const Route = createFileRoute("/admin/inventory")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(inventoryQueryOptions()),
  component: InventoryPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStatus(item: InventoryItem): StockStatus {
  if (item.available === 0) return "out"
  if (item.available <= item.lowStockThreshold) return "low"
  return "ok"
}

function AvailableCell({ item }: { item: InventoryItem }) {
  const status = stockStatus(item)

  if (status === "out") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />0
      </span>
    )
  }
  if (status === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-amber-600 dark:text-amber-400">
        <AlertTriangleIcon className="h-3.5 w-3.5" />
        {item.available}
      </span>
    )
  }
  return <span className="text-sm tabular-nums">{item.available.toLocaleString()}</span>
}

const ADJUSTMENT_REASONS = [
  { value: "restock",    label: "Restock"         },
  { value: "damage",     label: "Damage / Loss"   },
  { value: "correction", label: "Correction"      },
  { value: "return",     label: "Customer Return" },
  { value: "other",      label: "Other"           },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function InventoryPage() {
  const queryClient = useQueryClient()
  const { data: allPage } = useSuspenseQuery(inventoryQueryOptions())
  const { data: lowPage } = useSuspenseQuery(inventoryQueryOptions({ lowStock: true }))

  const [activeTab, setActiveTab]       = React.useState<"all" | "low" | "out">("all")
  const [adjustItem, setAdjustItem]     = React.useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty]       = React.useState(0)
  const [adjustReason, setAdjustReason] = React.useState("")
  const [adjustNotes, setAdjustNotes]   = React.useState("")

  const allItems = allPage.items
  const lowItems = lowPage.items
  const outItems = allItems.filter((i) => stockStatus(i) === "out")

  const lowStockCount = lowItems.length
  const outStockCount = outItems.length

  const filteredData = React.useMemo(() => {
    if (activeTab === "low") return lowItems
    if (activeTab === "out") return outItems
    return allItems
  }, [activeTab, allItems, lowItems, outItems])

  const adjustMutation = useMutation({
    mutationFn: (vars: { variantId: string; delta: number; reason: string; notes?: string }) =>
      adjustInventoryServerFn({ data: vars }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setAdjustItem(null)
    },
  })

  const openAdjust = React.useCallback((item: InventoryItem) => {
    setAdjustItem(item)
    setAdjustQty(0)
    setAdjustReason("")
    setAdjustNotes("")
  }, [])

  const columns: DataTableColumn<InventoryItem>[] = React.useMemo(
    () => [
      {
        key: "sku",
        header: "SKU",
        className: "w-44",
        render: (row) => (
          <span className="font-mono text-sm font-medium tracking-wide">{row.sku}</span>
        ),
      },
      {
        key: "product",
        header: "Product",
        render: (row) => (
          <div>
            <p className="text-sm font-medium">{row.productName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{row.variantName ?? "—"}</p>
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
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage stock levels across all your products.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
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

      {/* ── Stock Adjustment Sheet ── */}
      <Sheet open={adjustItem !== null} onOpenChange={(open) => !open && setAdjustItem(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Adjust Stock</SheetTitle>
            {adjustItem && (
              <SheetDescription>
                {adjustItem.sku} — {adjustItem.productName}
                {adjustItem.variantName ? `, ${adjustItem.variantName}` : ""}
              </SheetDescription>
            )}
          </SheetHeader>

          {adjustItem && (
            <div className="flex flex-col gap-5 px-4 pb-4">
              {/* Current stock summary */}
              <div className="grid grid-cols-3 divide-x rounded-lg border text-center">
                <div className="px-3 py-3">
                  <p className="text-xs text-muted-foreground">On hand</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {adjustItem.onHand}
                  </p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-xs text-muted-foreground">Reserved</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {adjustItem.reserved}
                  </p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {adjustItem.available}
                  </p>
                </div>
              </div>

              {/* Quantity adjustment */}
              <div className="space-y-2">
                <Label>Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setAdjustQty((q) => q - 1)}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    className="text-center tabular-nums"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setAdjustQty((q) => q + 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {adjustQty !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    New available:{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {adjustItem.available + adjustQty}
                    </span>
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="adjust-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger id="adjust-reason">
                    <SelectValue placeholder="Select a reason…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="adjust-notes">
                  Notes{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="adjust-notes"
                  placeholder="Add a note…"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              {adjustMutation.isError && (
                <p className="text-sm text-destructive">
                  {adjustMutation.error.message}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAdjustItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800"
                  disabled={adjustQty === 0 || !adjustReason || adjustMutation.isPending}
                  onClick={() =>
                    adjustMutation.mutate({
                      variantId: adjustItem.variantId,
                      delta: adjustQty,
                      reason: adjustReason,
                      notes: adjustNotes || undefined,
                    })
                  }
                >
                  {adjustMutation.isPending ? "Saving…" : "Save adjustment"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
