import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  HomeIcon,
  BuildingIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  CustomerAvatar,
  CustomerStatusBadge,
  CUSTOMER_STATUS_STYLES,
  type CustomerStatus,
} from "~/routes/admin/customers"
import { OrderStatusBadge } from "~/routes/admin/orders"

export const Route = createFileRoute("/admin/customers_/$customerId")({
  component: CustomerDetailPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type Address = {
  id: string
  label: string
  icon: "home" | "office"
  line1: string
  city: string
  region: string
  zip: string
  country: string
  isDefault: boolean
}

type OrderRow = {
  id: string
  number: string
  date: string
  total: number
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const SEED_CUSTOMER = {
  id: "1",
  name: "John Smith",
  email: "john@email.com",
  phone: "+960 773-1234",
  status: "active" as CustomerStatus,
  marketingOptIn: true,
  lastLogin: "May 11, 2026",
  since: "Jan 15, 2026",
  stats: {
    totalOrders: 8,
    totalSpent: 1247.00,
    avgOrder: 155.88,
  },
}

const SEED_ADDRESSES: Address[] = [
  {
    id: "a1",
    label: "Home",
    icon: "home",
    line1: "123 Beach Road",
    city: "Malé",
    region: "Kaafu Atoll",
    zip: "20001",
    country: "Maldives",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Office",
    icon: "office",
    line1: "45 Orchid Magu",
    city: "Malé",
    region: "Kaafu Atoll",
    zip: "20002",
    country: "Maldives",
    isDefault: false,
  },
]

const ORDER_HISTORY: OrderRow[] = [
  { id: "o1", number: "ORD-20260519-0025", date: "May 19, 2026", total: 171.99, status: "paid"      },
  { id: "o2", number: "ORD-20260512-0018", date: "May 12, 2026", total: 89.50,  status: "delivered" },
  { id: "o3", number: "ORD-20260505-0015", date: "May 5, 2026",  total: 234.00, status: "delivered" },
  { id: "o4", number: "ORD-20260428-0012", date: "Apr 28, 2026", total: 89.00,  status: "delivered" },
  { id: "o5", number: "ORD-20260421-0009", date: "Apr 21, 2026", total: 149.99, status: "delivered" },
  { id: "o6", number: "ORD-20260414-0006", date: "Apr 14, 2026", total: 178.00, status: "delivered" },
  { id: "o7", number: "ORD-20260407-0003", date: "Apr 7, 2026",  total: 149.99, status: "delivered" },
  { id: "o8", number: "ORD-20260401-0001", date: "Apr 1, 2026",  total: 184.52, status: "delivered" },
]

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomerDetailPage() {
  const [status, setStatus]     = React.useState<CustomerStatus>(SEED_CUSTOMER.status)
  const [marketing, setMkt]     = React.useState(SEED_CUSTOMER.marketingOptIn)
  const [addresses, setAddresses] = React.useState<Address[]>(SEED_ADDRESSES)

  const customer = SEED_CUSTOMER

  function setDefault(id: string) {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    )
  }

  function removeAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            to="/admin/customers"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Customers
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-foreground">{customer.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar name={customer.name} size="md" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{customer.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`px-2 py-0 text-[11px] font-medium capitalize ${CUSTOMER_STATUS_STYLES[status]}`}
                >
                  {status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Customer since {customer.since}
                </span>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-2">
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* ── Profile + Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Profile */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Name
                </span>
                <span className="text-sm font-medium">{customer.name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Email
                </span>
                <span className="text-sm">{customer.email}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Phone
                </span>
                <span className="text-sm">{customer.phone}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Last login
                </span>
                <span className="text-sm text-muted-foreground">
                  {customer.lastLogin}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Account status
                  </p>
                </div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as CustomerStatus)}
                >
                  <SelectTrigger className="h-8 w-32 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Marketing emails</p>
                  <p className="text-xs text-muted-foreground">
                    Customer has opted {marketing ? "in" : "out"} of marketing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMkt((v) => !v)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                    marketing
                      ? "border-amber-500 bg-amber-500"
                      : "border-border bg-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                      marketing
                        ? "left-0.5 translate-x-4 bg-white"
                        : "left-0.5 translate-x-0 bg-muted-foreground/40",
                    )}
                  />
                </button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <StatTile
                label="Total orders"
                value={String(customer.stats.totalOrders)}
              />
              <StatTile
                label="Total spent"
                value={`$${customer.stats.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
              <StatTile
                label="Average order"
                value={`$${customer.stats.avgOrder.toFixed(2)}`}
              />
              <StatTile
                label="Customer since"
                value={customer.since}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Addresses ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Addresses</CardTitle>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <PlusIcon className="h-3.5 w-3.5" />
              Add address
            </Button>
          </div>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          {addresses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No addresses saved.
            </p>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className="flex items-start gap-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {addr.icon === "home" ? (
                    <HomeIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{addr.label}</p>
                    {addr.isDefault && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-medium text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <address className="mt-1 not-italic space-y-0 text-xs text-muted-foreground leading-relaxed">
                    <p>{addr.line1}</p>
                    <p>
                      {addr.city}
                      {addr.region ? `, ${addr.region}` : ""} {addr.zip}
                    </p>
                    <p>{addr.country}</p>
                  </address>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!addr.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setDefault(addr.id)}
                    >
                      <StarIcon className="h-3 w-3" />
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAddress(addr.id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Order history ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold">Order history</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" asChild>
            <Link to="/admin/orders">View all orders</Link>
          </Button>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-4 border-t border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span className="flex-1">Order</span>
          <span className="w-32">Date</span>
          <span className="w-24 text-right">Total</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-8 shrink-0" />
        </div>

        {ORDER_HISTORY.map((order, i) => (
          <div
            key={order.id}
            className={cn(
              "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20",
              i < ORDER_HISTORY.length - 1 && "border-b border-border/50",
            )}
          >
            <p className="flex-1 font-mono text-sm font-medium">{order.number}</p>
            <p className="w-32 text-sm text-muted-foreground">{order.date}</p>
            <p className="w-24 text-right text-sm font-semibold tabular-nums">
              ${order.total.toFixed(2)}
            </p>
            <div className="flex w-24 justify-center">
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="w-8 shrink-0 text-right">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link
                  to="/admin/orders/$orderId"
                  params={{ orderId: order.id }}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </Card>

    </div>
  )
}
