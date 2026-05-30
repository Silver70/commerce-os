import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PackageIcon,
  TruckIcon,
  RotateCcwIcon,
  XCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  AlertTriangleIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { ORDER_STATUS_STYLES } from "~/routes/admin/orders_/index";
import { orderQueryOptions } from "~/queries/orders";
import {
  updateOrderStatusServerFn,
  addOrderNoteServerFn,
  refundOrderServerFn,
  createShipmentServerFn,
} from "~/server/orders";
import { formatMoney } from "~/lib/money";
import { parseApiError } from "~/lib/errors";
import type { OrderStatus } from "~/types/api";

export const Route = createFileRoute("/admin/orders_/$orderId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(orderQueryOptions(params.orderId)),
  component: OrderDetailPage,
});

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const refundSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  reason: z.string().optional(),
});

const shipmentSchema = z.object({
  carrier: z.string().min(1, "Carrier is required"),
  trackingNumber: z.string().min(1, "Tracking number is required"),
  trackingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// ─── Timeline helpers ─────────────────────────────────────────────────────────

function timelineDotClass(eventType: string | undefined): string {
  if (!eventType) return "bg-blue-500";
  if (eventType.includes("note")) return "bg-muted-foreground/50";
  if (eventType.includes("shipment")) return "bg-violet-500";
  if (
    eventType.includes("payment") ||
    eventType.includes("placed") ||
    eventType.includes("created") ||
    eventType.includes("manually")
  )
    return "bg-emerald-500";
  return "bg-blue-500";
}

function timelineTitle(eventType: string | undefined): string {
  if (!eventType) return "Event";
  const titles: Record<string, string> = {
    status_changed: "Status changed",
    note_added: "Note added",
    payment_received: "Payment received",
    refund_issued: "Refund issued",
    shipment_created: "Shipment created",
    manually_created: "Order created manually",
  };
  return (
    titles[eventType] ??
    eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────

function RefundModal({
  totalCents,
  currency,
  orderNumber,
  orderId,
  onClose,
}: {
  totalCents: number;
  currency: string;
  orderNumber: string;
  orderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState((totalCents / 100).toFixed(2));
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { amount: number; reason: string }) =>
      refundOrderServerFn({
        data: { orderId, amount: payload.amount, reason: payload.reason },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderQueryOptions(orderId).queryKey,
      });
      onClose();
    },
    onError: (err) => {
      const msg = parseApiError(err).message;
      setError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function handleSubmit() {
    setError(null);
    const result = refundSchema.safeParse({
      amount,
      reason: reason || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    mutation.mutate({
      amount: Math.round(result.data.amount * 100),
      reason: result.data.reason ?? "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold">
            Issue Refund
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <p>
              Order:{" "}
              <span className="font-mono font-medium text-foreground">
                {orderNumber}
              </span>
            </p>
            <p>
              Total paid:{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(totalCents, currency)}
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Refund amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 pl-6 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">
                  Customer request
                </SelectItem>
                <SelectItem value="defective">Defective item</SelectItem>
                <SelectItem value="not_received">Item not received</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive/80">
              This will refund <strong>${amount}</strong> to the customer via
              Stripe. This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 bg-destructive px-4 text-white shadow-none hover:bg-destructive/90"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processing…" : "Issue refund"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shipment Sheet ───────────────────────────────────────────────────────────

function ShipmentSheet({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [trackingUrl, setTrackingUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: {
      carrier: string;
      trackingNumber: string;
      trackingUrl?: string;
    }) => createShipmentServerFn({ data: { orderId, ...payload } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderQueryOptions(orderId).queryKey,
      });
      onClose();
    },
    onError: (err) => {
      const msg = parseApiError(err).message;
      setError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function handleSubmit() {
    setError(null);
    const result = shipmentSchema.safeParse({
      carrier,
      trackingNumber,
      trackingUrl: trackingUrl || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    mutation.mutate({
      carrier: result.data.carrier,
      trackingNumber: result.data.trackingNumber,
      trackingUrl: result.data.trackingUrl || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Shipment</SheetTitle>
          <SheetDescription>
            Enter tracking details for this shipment.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="carrier">
              Carrier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. UPS, FedEx, USPS"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackingNumber">
              Tracking number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
            <Input
              id="trackingUrl"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 bg-violet-600 text-white shadow-none hover:bg-violet-700"
            >
              {mutation.isPending ? "Creating…" : "Create shipment"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderId));

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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
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
              <Badge
                variant="outline"
                className={`px-2 py-0 text-[11px] font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}
              >
                {order.status}
              </Badge>
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
                  <Badge
                    variant="outline"
                    className={`px-2 py-0 text-[11px] font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </Badge>
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
                  className="w-full justify-start gap-2.5 bg-orange-700 text-white shadow-none hover:bg-orange-800"
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
                      className="h-8 bg-orange-700 px-3 text-white shadow-none hover:bg-orange-800"
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
