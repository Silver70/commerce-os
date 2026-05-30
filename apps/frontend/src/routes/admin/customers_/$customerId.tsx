import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  BuildingIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import {
  CustomerAvatar,
  CustomerStatusBadge,
  fullName,
} from "~/routes/admin/customers_/index"
import { OrderStatusBadge } from "~/routes/admin/orders_/index"
import { formatMoney } from "~/lib/money"
import { customerQueryOptions, customersQueryOptions } from "~/queries/customers"
import { ordersQueryOptions } from "~/queries/orders"
import { updateCustomerStatusServerFn } from "~/server/customers"
import type { CustomerAddress, CustomerStatus, Order } from "~/types/api"
import { Badge } from "~/components/ui/badge"

export const Route = createFileRoute("/admin/customers_/$customerId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(customerQueryOptions(params.customerId)),
  component: CustomerDetailPage,
})

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

// ─── Address row ──────────────────────────────────────────────────────────────

function AddressRow({ addr }: { addr: CustomerAddress }) {
  const displayName = [addr.firstName, addr.lastName].filter(Boolean).join(" ")
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {addr.isDefault ? (
          <HomeIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{addr.isDefault ? "Default address" : "Address"}</p>
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
          {displayName && <p>{displayName}</p>}
          <p>
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ""}
          </p>
          <p>
            {addr.city}
            {addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
          </p>
          <p>{addr.countryCode}</p>
          {addr.phone && <p>{addr.phone}</p>}
        </address>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomerDetailPage() {
  const { customerId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: customer } = useSuspenseQuery(customerQueryOptions(customerId))
  const { data: ordersData } = useQuery(ordersQueryOptions({ customerId }))

  const orders: Order[] = ordersData?.orders ?? []
  const [mutError, setMutError] = React.useState<string | null>(null)

  const statusMutation = useMutation({
    mutationFn: (status: CustomerStatus) =>
      updateCustomerStatusServerFn({ data: { customerId, status } }),
    onSuccess: () => {
      setMutError(null)
      queryClient.invalidateQueries({ queryKey: customerQueryOptions(customerId).queryKey })
      queryClient.invalidateQueries({ queryKey: customersQueryOptions().queryKey })
    },
    onError: (err) =>
      setMutError(err instanceof Error ? err.message : "Failed to update status"),
  })

  const name = fullName(customer)

  const totalSpent = customer.totalSpent ?? orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = customer.ordersCount ?? orders.length

  const since = new Date(customer.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const lastLogin = customer.lastLoginAt
    ? new Date(customer.lastLoginAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never"

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
          <span className="text-foreground">{name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar name={name} size="md" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <CustomerStatusBadge status={customer.status} />
                <span className="text-xs text-muted-foreground">
                  Customer since {since}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            disabled={statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate(customer.status === "active" ? "disabled" : "active")
            }
          >
            {customer.status === "active" ? "Disable account" : "Re-enable account"}
          </Button>
        </div>

        {mutError && (
          <p className="mt-2 text-sm text-destructive">{mutError}</p>
        )}
      </div>

      {/* ── Profile + Stats ────────────────────────────────────────────────── */}
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
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Email
                </span>
                <span className="text-sm">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-baseline justify-between">
                  <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                    Phone
                  </span>
                  <span className="text-sm">{customer.phone}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Last login
                </span>
                <span className="text-sm text-muted-foreground">{lastLogin}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Marketing
                </span>
                <span className="text-sm text-muted-foreground">
                  {customer.marketingOptIn ? "Opted in" : "Opted out"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account status
              </p>
              <CustomerStatusBadge status={customer.status} />
            </div>
          </CardContent>
        </Card>

        {/* Overview stats */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <StatTile label="Total orders" value={String(totalOrders)} />
              <StatTile label="Total spent" value={formatMoney(totalSpent)} />
              <StatTile label="Customer since" value={since} />
              <StatTile label="Last login" value={lastLogin} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Addresses ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-sm font-semibold">Addresses</CardTitle>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          {!customer.addresses || customer.addresses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No addresses saved.
            </p>
          ) : (
            customer.addresses.map((addr) => (
              <AddressRow key={addr.id} addr={addr} />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Order history ──────────────────────────────────────────────────── */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold">Order history</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/admin/orders">View all orders</Link>
          </Button>
        </div>

        <div className="flex items-center gap-4 border-t border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span className="flex-1">Order</span>
          <span className="w-32">Date</span>
          <span className="w-24 text-right">Total</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-8 shrink-0" />
        </div>

        {orders.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No orders found.
          </p>
        ) : (
          orders.map((order, i) => (
            <div
              key={order.id}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20",
                i < orders.length - 1 && "border-b border-border/50",
              )}
            >
              <p className="flex-1 font-mono text-sm font-medium">{order.orderNumber}</p>
              <p className="w-32 text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="w-24 text-right text-sm font-semibold tabular-nums">
                {formatMoney(order.total, order.currency)}
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
                  <Link to="/admin/orders/$orderId" params={{ orderId: order.id }}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

    </div>
  )
}
