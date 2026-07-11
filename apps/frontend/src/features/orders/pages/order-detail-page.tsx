import * as React from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PackageIcon,
  PlusIcon,
  RotateCcwIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { formatMoney } from "~/lib/money";
import { parseApiError } from "~/lib/errors";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { Order, OrderStatus } from "~/types/api";
import { orderQueryOptions } from "../queries";
import { addOrderNoteServerFn, updateOrderStatusServerFn } from "../server";
import { timelineDotClass, timelineTitle } from "../utils";
import { OrderStatusBadge } from "../components/order-status-badge";
import { RefundModal } from "../components/refund-modal";
import { ShipmentSheet } from "../components/shipment-sheet";

const route = getRouteApi("/admin/orders_/$orderId");

export function OrderDetailPage() {
  const { orderId } = route.useParams();
  const queryClient = useQueryClient();
  const order: Order = useSuspenseQuery(orderQueryOptions(orderId)).data;

  const [showRefund, setShowRefund] = React.useState(false);
  const [showShipment, setShowShipment] = React.useState(false);
  const [showNote, setShowNote] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [noteError, setNoteError] = React.useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      updateOrderStatusServerFn({ data: { orderId, status } }),
    onSuccess: () => {
      setStatusError(null);
      queryClient.invalidateQueries({
        queryKey: orderQueryOptions(orderId).queryKey,
      });
    },
    onError: (err) => {
      const msg = parseApiError(err).message;
      setStatusError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      addOrderNoteServerFn({ data: { orderId, note } }),
    onSuccess: () => {
      setNoteText("");
      setShowNote(false);
      setNoteError(null);
      queryClient.invalidateQueries({
        queryKey: orderQueryOptions(orderId).queryKey,
      });
    },
    onError: (err) => {
      const msg = parseApiError(err).message;
      setNoteError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function handleAddNote() {
    if (!noteText.trim()) return;
    noteMutation.mutate(noteText.trim());
  }

  const canRefund =
    order.status !== "pending" &&
    order.status !== "cancelled" &&
    order.status !== "refunded";

  const isTerminal =
    order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Orders
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="font-mono text-foreground">{order.orderNumber}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <div className="mt-1.5 flex items-center gap-2.5">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs text-muted-foreground">
                Placed {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Status card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Order
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fulfillment
                  </p>
                  <span className="text-sm font-medium capitalize text-muted-foreground">
                    {order.fulfillmentStatus}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Line items
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {(order.lineItems ?? []).map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(item.totalPrice, order.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} ×{" "}
                        {formatMoney(item.unitPrice, order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(order.subtotal, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    {formatMoney(order.shippingAmount, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">
                    {formatMoney(order.taxAmount, order.currency)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      −{formatMoney(order.discountAmount, order.currency)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div>
                <p className="text-sm font-medium">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customerEmail}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Actions card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4">
              {order.status === "paid" && (
                <Button
                  className="w-full justify-start gap-2.5"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("processing")}
                >
                  <PackageIcon className="h-4 w-4" />
                  Mark as processing
                </Button>
              )}
              {order.status === "processing" && (
                <Button
                  className="w-full justify-start gap-2.5 bg-violet-600 text-white shadow-none hover:bg-violet-700"
                  onClick={() => setShowShipment(true)}
                >
                  <TruckIcon className="h-4 w-4" />
                  Create shipment
                </Button>
              )}
              {order.status === "shipped" && (
                <Button
                  className="w-full justify-start gap-2.5 bg-emerald-600 text-white shadow-none hover:bg-emerald-700"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("delivered")}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark as delivered
                </Button>
              )}
              {order.status === "pending" && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:border-destructive/50"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("cancelled")}
                >
                  <XCircleIcon className="h-4 w-4" />
                  Cancel order
                </Button>
              )}
              {canRefund && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:border-destructive/50"
                  onClick={() => setShowRefund(true)}
                >
                  <RotateCcwIcon className="h-4 w-4" />
                  Issue refund
                </Button>
              )}
              {isTerminal && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  No further actions available.
                </p>
              )}
              {statusError && (
                <p className="text-sm text-destructive">{statusError}</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-0">
                {(order.timeline ?? []).map((event, i) => (
                  <div
                    key={event.id}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {i < (order.timeline ?? []).length - 1 && (
                      <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                    )}
                    <div
                      className={cn(
                        "mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-background",
                        timelineDotClass(event.eventType),
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">
                        {timelineTitle(event.eventType)}
                      </p>
                      {event.message && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {event.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60">
                        {event.actorId ?? "System"} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {showNote ? (
                <div className="space-y-2.5">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="Add an internal note…"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                  {noteError && (
                    <p className="text-sm text-destructive">{noteError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      disabled={noteMutation.isPending}
                      onClick={handleAddNote}
                    >
                      {noteMutation.isPending ? "Saving…" : "Save note"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      onClick={() => {
                        setShowNote(false);
                        setNoteText("");
                        setNoteError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNote(true)}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add note
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Refund modal ──────────────────────────────────────────────────────── */}
      {showRefund && (
        <RefundModal
          totalCents={order.total}
          currency={order.currency}
          orderNumber={order.orderNumber}
          orderId={orderId}
          onClose={() => setShowRefund(false)}
        />
      )}

      {/* ── Shipment sheet ────────────────────────────────────────────────────── */}
      <ShipmentSheet
        orderId={orderId}
        open={showShipment}
        onClose={() => setShowShipment(false)}
      />
    </div>
  );
}
