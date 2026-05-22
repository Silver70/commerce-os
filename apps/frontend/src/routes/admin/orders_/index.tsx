import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { EyeIcon, PlusIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTableFilter } from "~/components/data-table"

export const Route = createFileRoute("/admin/orders_/")({
  component: OrdersPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

type Order = {
  id: string
  number: string
  customerName: string
  customerEmail: string
  status: OrderStatus
  items: number
  total: number
  date: string
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const ORDERS: Order[] = [
  { id: "1",  number: "ORD-20260519-0025", customerName: "John Smith",     customerEmail: "john@email.com",     status: "paid",       items: 1, total: 171.99, date: "May 19, 2:34 PM"  },
  { id: "2",  number: "ORD-20260519-0024", customerName: "Sara Johnson",   customerEmail: "sara@email.com",     status: "processing", items: 2, total: 89.50,  date: "May 19, 1:15 PM"  },
  { id: "3",  number: "ORD-20260519-0023", customerName: "Guest User",     customerEmail: "guest@example.com",  status: "shipped",    items: 3, total: 234.00, date: "May 19, 11:02 AM" },
  { id: "4",  number: "ORD-20260519-0022", customerName: "Ali Hassan",     customerEmail: "ali@surf.com",       status: "pending",    items: 1, total: 55.00,  date: "May 19, 9:45 AM"  },
  { id: "5",  number: "ORD-20260518-0021", customerName: "Layla Ahmed",    customerEmail: "layla@ocean.com",    status: "delivered",  items: 2, total: 118.00, date: "May 18, 5:22 PM"  },
  { id: "6",  number: "ORD-20260518-0020", customerName: "Mike Torres",    customerEmail: "mike@example.com",   status: "paid",       items: 1, total: 229.00, date: "May 18, 3:40 PM"  },
  { id: "7",  number: "ORD-20260518-0019", customerName: "Nina Park",      customerEmail: "nina@waves.com",     status: "shipped",    items: 4, total: 310.50, date: "May 18, 2:05 PM"  },
  { id: "8",  number: "ORD-20260518-0018", customerName: "Omar Rashid",    customerEmail: "omar@beach.com",     status: "cancelled",  items: 1, total: 44.95,  date: "May 18, 10:30 AM" },
  { id: "9",  number: "ORD-20260517-0017", customerName: "Petra Müller",   customerEmail: "petra@surf.com",     status: "refunded",   items: 1, total: 149.99, date: "May 17, 4:50 PM"  },
  { id: "10", number: "ORD-20260517-0016", customerName: "Quinn Blake",    customerEmail: "quin@example.com",   status: "delivered",  items: 3, total: 197.00, date: "May 17, 2:30 PM"  },
  { id: "11", number: "ORD-20260517-0015", customerName: "Rosa Carvalho",  customerEmail: "rosa@ocean.com",     status: "processing", items: 2, total: 99.00,  date: "May 17, 11:20 AM" },
  { id: "12", number: "ORD-20260516-0014", customerName: "Sam Fisher",     customerEmail: "sam@waves.com",      status: "paid",       items: 1, total: 79.00,  date: "May 16, 6:15 PM"  },
  { id: "13", number: "ORD-20260516-0013", customerName: "Tina Fernandez", customerEmail: "tina@board.com",     status: "shipped",    items: 2, total: 258.00, date: "May 16, 4:45 PM"  },
  { id: "14", number: "ORD-20260516-0012", customerName: "Uma Patel",      customerEmail: "uma@surf.com",       status: "delivered",  items: 1, total: 54.00,  date: "May 16, 2:10 PM"  },
  { id: "15", number: "ORD-20260515-0011", customerName: "Val Laurent",    customerEmail: "val@ocean.com",      status: "paid",       items: 3, total: 347.50, date: "May 15, 5:30 PM"  },
  { id: "16", number: "ORD-20260515-0010", customerName: "Wade Chen",      customerEmail: "wade@beach.com",     status: "pending",    items: 1, total: 38.50,  date: "May 15, 3:20 PM"  },
  { id: "17", number: "ORD-20260515-0009", customerName: "Xena Kosta",     customerEmail: "xena@waves.com",     status: "shipped",    items: 2, total: 178.00, date: "May 15, 1:00 PM"  },
  { id: "18", number: "ORD-20260514-0008", customerName: "Yuki Tanaka",    customerEmail: "yuki@surf.com",      status: "refunded",   items: 1, total: 49.99,  date: "May 14, 4:30 PM"  },
  { id: "19", number: "ORD-20260514-0007", customerName: "Zara Wilson",    customerEmail: "zara@ocean.com",     status: "delivered",  items: 4, total: 423.00, date: "May 14, 2:45 PM"  },
  { id: "20", number: "ORD-20260513-0006", customerName: "Adam Brooks",    customerEmail: "adam@board.com",     status: "cancelled",  items: 1, total: 65.00,  date: "May 13, 11:30 AM" },
]

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
        <p className="font-mono text-sm font-semibold">{row.number}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.date}</p>
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
      <span className="text-sm tabular-nums text-muted-foreground">{row.items}</span>
    ),
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    className: "w-28",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">${row.total.toFixed(2)}</span>
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage and fulfill customer orders.
        </p>
      </div>

      <DataTable
        data={ORDERS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={10}
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
    </div>
  )
}
