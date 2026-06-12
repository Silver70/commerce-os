import * as React from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  KeyRoundIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { formatMoney } from "~/lib/money";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import type { Customer, CustomerStatus, Order } from "~/types/api";
import { customerGroupsQueryOptions } from "~/features/customer-groups/queries";
import { customerQueryOptions, customersQueryOptions } from "../queries";
import {
  updateCustomerStatusServerFn,
  generateSetPasswordLinkServerFn,
} from "../server";
import { fullName } from "../utils";
import { CustomerAvatar } from "../components/customer-avatar";
import { CustomerStatusBadge } from "../components/customer-status-badge";
import { EditCustomerSheet } from "../components/edit-customer-sheet";
import { StatTile } from "../components/stat-tile";
import { AddressRow } from "../components/address-row";
// Cross-feature: the order-history section reads from the orders feature.
import { ordersQueryOptions } from "~/features/orders/queries";
import { OrderStatusBadge } from "~/features/orders/components/order-status-badge";
import { CustomerPriceListsCard } from "~/features/price-lists/components/customer-price-lists-card";

const route = getRouteApi("/admin/customers_/$customerId");

export function CustomerDetailPage() {
  const { customerId } = route.useParams();
  const queryClient = useQueryClient();

  const customer: Customer = useSuspenseQuery(
    customerQueryOptions(customerId),
  ).data;
  const { data: ordersData } = useQuery(ordersQueryOptions({ customerId }));

  const orders: Order[] = ordersData?.orders ?? [];
  const [mutError, setMutError] = React.useState<string | null>(null);
  const [passwordLink, setPasswordLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const { data: groups = [] } = useQuery(customerGroupsQueryOptions());
  const groupName = customer.groupId
    ? (groups.find((g) => g.id === customer.groupId)?.name ?? "—")
    : "None";

  const statusMutation = useMutation({
    mutationFn: (status: CustomerStatus) =>
      updateCustomerStatusServerFn({ data: { customerId, status } }),
    onSuccess: () => {
      setMutError(null);
      queryClient.invalidateQueries({
        queryKey: customerQueryOptions(customerId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: customersQueryOptions().queryKey,
      });
    },
    onError: (err) =>
      setMutError(
        err instanceof Error ? err.message : "Failed to update status",
      ),
  });

  const linkMutation = useMutation({
    mutationFn: () => generateSetPasswordLinkServerFn({ data: { customerId } }),
    onSuccess: (result) => {
      setMutError(null);
      setCopied(false);
      setPasswordLink(result.setPasswordUrl);
    },
    onError: (err) =>
      setMutError(
        err instanceof Error ? err.message : "Failed to generate link",
      ),
  });

  async function copyPasswordLink() {
    if (!passwordLink) return;
    await navigator.clipboard.writeText(passwordLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const name = fullName(customer);

  const totalSpent =
    customer.totalSpent ?? orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = customer.ordersCount ?? orders.length;

  const since = new Date(customer.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lastLogin = customer.lastLoginAt
    ? new Date(customer.lastLoginAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

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

          <div className="flex shrink-0 items-center gap-2">
            <EditCustomerSheet customer={customer} />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate(
                  customer.status === "active" ? "disabled" : "active",
                )
              }
            >
              {customer.status === "active"
                ? "Disable account"
                : "Re-enable account"}
            </Button>
          </div>
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
                <span className="text-sm text-muted-foreground">
                  {lastLogin}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Marketing
                </span>
                <span className="text-sm text-muted-foreground">
                  {customer.marketingOptIn ? "Opted in" : "Opted out"}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                  Group
                </span>
                <span className="text-sm">{groupName}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account status
              </p>
              <CustomerStatusBadge status={customer.status} />
            </div>

            <Separator />

            {/* ── Set-password link ──────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Password
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {customer.emailVerified
                      ? "Account is active."
                      : "No password set yet."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5"
                  disabled={linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  <KeyRoundIcon className="h-3.5 w-3.5" />
                  {linkMutation.isPending ? "Generating…" : "Set-password link"}
                </Button>
              </div>

              {passwordLink && (
                <div className="flex gap-2">
                  <Input readOnly value={passwordLink} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5"
                    onClick={copyPasswordLink}
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}
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

      {/* ── Price lists ────────────────────────────────────────────────────── */}
      <CustomerPriceListsCard customerId={customerId} />

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
              <p className="flex-1 font-mono text-sm font-medium">
                {order.orderNumber}
              </p>
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
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: order.id }}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
