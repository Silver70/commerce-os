import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { EyeIcon, PlusIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTableFilter } from "~/components/data-table"
import { ordersQueryOptions } from "~/queries/orders"
import { getOrdersServerFn } from "~/server/orders"
import { formatMoney } from "~/lib/money"
import type { Order, OrderStatus } from "~/types/api"

export const Route = createFileRoute("/admin/orders_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(ordersQueryOptions()),
  component: OrdersPage,
})

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  paid:       "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  processing: "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400",
  shipped:    "text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
  delivered:  "text-muted-foreground border-border bg-muted/40",
  cancelled:  "text-destructive border-destructive/20 bg-destructive/10",
  refunded:   "text-destructive border-destructive/30 bg-transparent",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium capitalize px-2 py-0 ${ORDER_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: DataTableColumn<Order>[] = [
  {
    key: "order",
    header: "Order",
    render: (row) => (
      <div>
        <p className="font-mono text-sm font-semibold">{row.orderNumber}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (row) => (
      <div>
        <p className="text-sm font-medium">{row.customerName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.customerEmail}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <OrderStatusBadge status={row.status} />,
  },
  {
    key: "items",
    header: "Items",
    align: "center",
    className: "w-20",
    render: (row) => (
      <span className="text-sm tabular-nums text-muted-foreground">{row.lineItems.length}</span>
    ),
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    className: "w-28",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">
        {formatMoney(row.total, row.currency)}
      </span>
    ),
  },
  {
    key: "view",
    header: "",
    align: "center",
    className: "w-14 pl-6",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/orders/$orderId" params={{ orderId: row.id }}>
          <EyeIcon className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
]

// ─── Filters ──────────────────────────────────────────────────────────────────

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Pending",    value: "pending"    },
      { label: "Paid",       value: "paid"       },
      { label: "Processing", value: "processing" },
      { label: "Shipped",    value: "shipped"    },
      { label: "Delivered",  value: "delivered"  },
      { label: "Cancelled",  value: "cancelled"  },
      { label: "Refunded",   value: "refunded"   },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrdersPage() {
  const { data: page } = useSuspenseQuery(ordersQueryOptions())
  const [items, setItems] = React.useState<Order[]>(page.items)
  const [nextCursor, setNextCursor] = React.useState<string | null>(page.nextCursor)
  const [loadingMore, setLoadingMore] = React.useState(false)

  React.useEffect(() => {
    setItems(page.items)
    setNextCursor(page.nextCursor)
  }, [page])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const more = await getOrdersServerFn({ data: { cursor: nextCursor } })
      setItems((prev) => [...prev, ...more.items])
      setNextCursor(more.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage and fulfill customer orders.
          {page.totalCount > 0 && (
            <span className="ml-1">({page.totalCount} total)</span>
          )}
        </p>
      </div>

      <DataTable
        data={items}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={25}
        emptyMessage="No orders match your filters."
        action={
          <Button
            className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
            asChild
          >
            <Link to="/admin/orders/new">
              <PlusIcon className="h-4 w-4" />
              Create order
            </Link>
          </Button>
        }
      />

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
