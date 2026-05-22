import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
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
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
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
import { ORDER_STATUS_STYLES } from "~/routes/admin/orders_/index"

export const Route = createFileRoute("/admin/orders_/$orderId")({
  component: OrderDetailPage,
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

type LineItem = {
  id: string
  product: string
  variant: string
  sku: string
  gradient: string
  qty: number
  unitPrice: number
}

type TimelineEvent = {
  id: string
  type: "placed" | "payment" | "status" | "note" | "shipment"
  title: string
  description: string
  actor: string
  time: string
}

type Address = {
  name: string
  line1: string
  line2?: string
  city: string
  region: string
  zip: string
  country: string
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const SEED_ORDER = {
  number: "ORD-20260519-0025",
  placedAt: "May 19, 2026 at 2:34 PM",
  status: "paid" as OrderStatus,
  paymentStatus: "Captured",
  fulfillmentStatus: "Unfulfilled",
  customer: {
    name: "John Smith",
    email: "john@email.com",
    phone: "+960 773-1234",
  },
  shipping: {
    name: "John Smith",
    line1: "123 Beach Road",
    city: "Malé",
    region: "Kaafu Atoll",
    zip: "20001",
    country: "Maldives",
  } as Address,
  billingSameAsShipping: true,
  items: [
    {
      id: "1",
      product: "Wave Board Pro",
      variant: "S / Red",
      sku: "WAVE-S-RED",
      gradient: "from-blue-400 via-blue-500 to-indigo-700",
      qty: 1,
      unitPrice: 149.99,
    },
  ] as LineItem[],
  subtotal:     149.99,
  shippingCost:  10.00,
  tax:           12.00,
  discount:       0.00,
  total:        171.99,
  payment: {
    provider:  "Stripe",
    intentId:  "pi_3O8cXqLmNp789xyz",
    status:    "Captured",
    cardBrand: "Visa",
    cardLast4: "4242",
    amount:   171.99,
  },
  timeline: [
    { id: "1", type: "placed"  as const, title: "Order placed",      description: "Customer placed the order via the storefront.",    actor: "Customer",    time: "May 19, 2026 at 2:34 PM" },
    { id: "2", type: "payment" as const, title: "Payment captured",  description: "Stripe captured $171.99 from Visa ending 4242.",  actor: "System",      time: "May 19, 2026 at 2:35 PM" },
    { id: "3", type: "status"  as const, title: "Status updated",    description: "Order status changed: pending → paid.",           actor: "System",      time: "May 19, 2026 at 2:35 PM" },
  ] as TimelineEvent[],
}

// ─── Timeline dot styles ──────────────────────────────────────────────────────

const TIMELINE_DOT: Record<TimelineEvent["type"], string> = {
  placed:   "bg-emerald-500",
  payment:  "bg-emerald-500",
  status:   "bg-blue-500",
  note:     "bg-muted-foreground/50",
  shipment: "bg-violet-500",
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────

function RefundModal({
  total,
  orderNumber,
  onClose,
}: {
  total: number
  orderNumber: string
  onClose: () => void
}) {
  const [amount, setAmount] = React.useState(total.toFixed(2))
  const [reason, setReason] = React.useState("")
  const [restock, setRestock] = React.useState(true)
  const [note, setNote] = React.useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold">Issue Refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <p>Order: <span className="font-mono font-medium text-foreground">{orderNumber}</span></p>
            <p>Total paid: <span className="font-semibold text-foreground">${total.toFixed(2)}</span></p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Refund amount <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 pl-6 text-sm"
                />
              </div>
              <Select defaultValue="full">
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full refund</SelectItem>
                  <SelectItem value="partial">Partial refund</SelectItem>
                </SelectContent>
              </Select>
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
                <SelectItem value="customer_request">Customer request</SelectItem>
                <SelectItem value="defective">Defective item</SelectItem>
                <SelectItem value="not_received">Item not received</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-amber-500"
            />
            <span className="text-sm">Restock items</span>
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Note (optional)
            </Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
              placeholder="Internal note about this refund…"
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive/80">
              This will refund <strong>${amount}</strong> to the customer's original payment method via Stripe. This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-9" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 bg-destructive px-4 text-white shadow-none hover:bg-destructive/90"
              onClick={onClose}
            >
              Issue refund
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const [status, setStatus]           = React.useState<OrderStatus>(SEED_ORDER.status)
  const [timeline, setTimeline]       = React.useState<TimelineEvent[]>(SEED_ORDER.timeline)
  const [showRefund, setShowRefund]   = React.useState(false)
  const [showNote, setShowNote]       = React.useState(false)
  const [noteText, setNoteText]       = React.useState("")

  const order = SEED_ORDER

  function markAs(newStatus: OrderStatus, label: string) {
    const prev = status
    setStatus(newStatus)
    setTimeline((t) => [
      ...t,
      {
        id: String(Date.now()),
        type: "status",
        title: "Status updated",
        description: `Order status changed: ${prev} → ${newStatus}.`,
        actor: "You",
        time: "Just now",
      },
    ])
  }

  function addNote() {
    if (!noteText.trim()) return
    setTimeline((t) => [
      ...t,
      {
        id: String(Date.now()),
        type: "note",
        title: "Note added",
        description: noteText.trim(),
        actor: "You",
        time: "Just now",
      },
    ])
    setNoteText("")
    setShowNote(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

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
          <span className="font-mono text-foreground">{order.number}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{order.number}</h1>
            <div className="mt-1.5 flex items-center gap-2.5">
              <Badge
                variant="outline"
                className={`px-2 py-0 text-[11px] font-medium capitalize ${ORDER_STATUS_STYLES[status]}`}
              >
                {status}
              </Badge>
              <span className="text-xs text-muted-foreground">Placed {order.placedAt}</span>
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
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order</p>
                  <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment</p>
                  <div className="flex h-8 items-center">
                    <span className="text-sm font-medium text-emerald-600">{order.paymentStatus}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fulfillment</p>
                  <div className="flex h-8 items-center">
                    <span className="text-sm font-medium text-muted-foreground">{order.fulfillmentStatus}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Line items</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${item.gradient}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.product}</p>
                      <p className="text-xs text-muted-foreground">{item.variant}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">${(item.qty * item.unitPrice).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{item.qty} × ${item.unitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="tabular-nums">${order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (GST 6%)</span>
                  <span className="tabular-nums">${order.tax.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="tabular-nums">−${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">${order.total.toFixed(2)}</span>
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
                <p className="text-sm font-medium">{order.customer.name}</p>
                <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                View customer profile
              </Button>
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <address className="not-italic space-y-0.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{order.shipping.name}</p>
                <p>{order.shipping.line1}</p>
                {order.shipping.line2 && <p>{order.shipping.line2}</p>}
                <p>{order.shipping.city}{order.shipping.region ? `, ${order.shipping.region}` : ""} {order.shipping.zip}</p>
                <p>{order.shipping.country}</p>
              </address>
            </CardContent>
          </Card>

          {/* Billing address */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Billing address</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {order.billingSameAsShipping ? (
                <p className="text-sm text-muted-foreground">Same as shipping address</p>
              ) : (
                <address className="not-italic space-y-0.5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{order.shipping.name}</p>
                  <p>{order.shipping.line1}</p>
                  <p>{order.shipping.city}, {order.shipping.zip}</p>
                  <p>{order.shipping.country}</p>
                </address>
              )}
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
              {status === "paid" && (
                <Button
                  className="w-full justify-start gap-2.5 bg-orange-700 text-white shadow-none hover:bg-orange-800"
                  onClick={() => markAs("processing", "Mark as processing")}
                >
                  <PackageIcon className="h-4 w-4" />
                  Mark as processing
                </Button>
              )}
              {status === "processing" && (
                <Button
                  className="w-full justify-start gap-2.5 bg-violet-600 text-white shadow-none hover:bg-violet-700"
                  onClick={() => markAs("shipped", "Create shipment")}
                >
                  <TruckIcon className="h-4 w-4" />
                  Create shipment
                </Button>
              )}
              {status === "shipped" && (
                <Button
                  className="w-full justify-start gap-2.5 bg-emerald-600 text-white shadow-none hover:bg-emerald-700"
                  onClick={() => markAs("delivered", "Mark as delivered")}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark as delivered
                </Button>
              )}
              {status === "pending" && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:border-destructive/50"
                  onClick={() => markAs("cancelled", "Cancel order")}
                >
                  <XCircleIcon className="h-4 w-4" />
                  Cancel order
                </Button>
              )}
              {status !== "pending" && status !== "cancelled" && status !== "refunded" && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:border-destructive/50"
                  onClick={() => setShowRefund(true)}
                >
                  <RotateCcwIcon className="h-4 w-4" />
                  Issue refund
                </Button>
              )}
              {(status === "cancelled" || status === "refunded" || status === "delivered") && (
                <p className="text-center text-xs text-muted-foreground pt-1">No further actions available.</p>
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
                {timeline.map((event, i) => (
                  <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* Vertical connector */}
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                    )}
                    {/* Dot */}
                    <div className={cn("mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-background", TIMELINE_DOT[event.type])} />
                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">{event.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {event.actor} · {event.time}
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
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-8 bg-orange-700 px-3 text-white shadow-none hover:bg-orange-800" onClick={addNote}>
                      Save note
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => { setShowNote(false); setNoteText("") }}>
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

          {/* Payment card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-medium">{order.payment.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium text-emerald-600">{order.payment.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-medium">{order.payment.cardBrand} ···· {order.payment.cardLast4}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold tabular-nums">${order.payment.amount.toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Payment intent</p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                  <span className="flex-1 truncate font-mono text-xs">{order.payment.intentId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.payment.intentId)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Refund modal ──────────────────────────────────────────────────────── */}
      {showRefund && (
        <RefundModal
          total={order.total}
          orderNumber={order.number}
          onClose={() => setShowRefund(false)}
        />
      )}
    </div>
  )
}
