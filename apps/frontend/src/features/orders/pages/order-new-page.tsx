import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  FileTextIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ProductSearch } from "../components/product-search";
import {
  CUSTOMER_CATALOG,
  DISCOUNT_CODES,
  SHIPPING_METHODS,
} from "../mock-catalog";
import type {
  CatalogCustomer,
  CatalogProduct,
  DiscountCode,
  LineItem,
} from "../types";

export function OrderNewPage() {
  // Line items
  const [items, setItems] = React.useState<LineItem[]>([
    {
      id: "seed1",
      catalogId: "p1",
      product: "Wave Board Pro",
      variant: "S / Red",
      sku: "WAVE-S-RED",
      gradient: "from-blue-400 via-blue-500 to-indigo-700",
      qty: 1,
      unitPrice: 149.99,
    },
    {
      id: "seed2",
      catalogId: "p4",
      product: "Blue Rashguard",
      variant: "S / Blue",
      sku: "RASH-S-BLUE",
      gradient: "from-cyan-400 via-teal-500 to-cyan-700",
      qty: 2,
      unitPrice: 49.99,
    },
    {
      id: "seed3",
      catalogId: "p8",
      product: "Canvas Tote Bag",
      variant: "Natural",
      sku: "ACC-0045-N",
      gradient: "from-rose-400 via-rose-500 to-rose-700",
      qty: 1,
      unitPrice: 24.0,
    },
  ]);

  // Customer
  const [customer, setCustomer] = React.useState<CatalogCustomer | null>(
    CUSTOMER_CATALOG[0],
  );
  const [custQuery, setCustQuery] = React.useState("");
  const [custFocused, setCustFocused] = React.useState(false);

  // Shipping address (pre-filled from selected customer)
  const [addrName, setAddrName] = React.useState(CUSTOMER_CATALOG[0].name);
  const [addrLine1, setAddrLine1] = React.useState(
    CUSTOMER_CATALOG[0].address.line1,
  );
  const [addrCity, setAddrCity] = React.useState(
    CUSTOMER_CATALOG[0].address.city,
  );
  const [addrRegion, setAddrRegion] = React.useState(
    CUSTOMER_CATALOG[0].address.region,
  );
  const [addrZip, setAddrZip] = React.useState(CUSTOMER_CATALOG[0].address.zip);
  const [addrCountry, setAddrCountry] = React.useState(
    CUSTOMER_CATALOG[0].address.country,
  );

  // Order options
  const [shipping, setShipping] = React.useState("standard");
  const [paymentType, setPaymentType] = React.useState<"paid" | "invoice">(
    "paid",
  );
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [discountCode, setDiscountCode] = React.useState("");
  const [appliedDiscount, setAppliedDiscount] =
    React.useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = React.useState("");
  const [note, setNote] = React.useState("");

  // ─── Computed totals ─────────────────────────────────────────────────────

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const shippingCost =
    SHIPPING_METHODS.find((m) => m.id === shipping)?.price ?? 0;
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "percent"
      ? subtotal * (appliedDiscount.value / 100)
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const tax = (subtotal - discountAmount) * 0.06;
  const total = subtotal + shippingCost - discountAmount + tax;

  // ─── Actions ─────────────────────────────────────────────────────────────

  function addItem(p: CatalogProduct) {
    setItems((prev) => {
      const existing = prev.find((i) => i.catalogId === p.id);
      if (existing)
        return prev.map((i) =>
          i.catalogId === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [
        ...prev,
        {
          id: String(Date.now()),
          catalogId: p.id,
          product: p.product,
          variant: p.variant,
          sku: p.sku,
          gradient: p.gradient,
          qty: 1,
          unitPrice: p.price,
        },
      ];
    });
  }

  function setQty(id: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }

  function setPrice(id: string, raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, unitPrice: n } : i)),
      );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function selectCustomer(c: CatalogCustomer) {
    setCustomer(c);
    setAddrName(c.name);
    setAddrLine1(c.address.line1);
    setAddrCity(c.address.city);
    setAddrRegion(c.address.region);
    setAddrZip(c.address.zip);
    setAddrCountry(c.address.country);
    setCustQuery("");
  }

  function applyDiscount() {
    const key = discountCode.trim().toUpperCase();
    if (DISCOUNT_CODES[key]) {
      setAppliedDiscount(DISCOUNT_CODES[key]);
      setDiscountError("");
    } else {
      setAppliedDiscount(null);
      setDiscountError("Invalid or expired code.");
    }
  }

  const custResults =
    custQuery.length > 0
      ? CUSTOMER_CATALOG.filter(
          (c) =>
            c.name.toLowerCase().includes(custQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(custQuery.toLowerCase()),
        )
      : [];

  const canCreate = items.length > 0 && customer !== null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <span className="text-foreground">New order</span>
          </div>
          <h1 className="text-2xl font-semibold">Create order</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manually place an order on behalf of a customer.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="lg" className="h-9 px-4" asChild>
            <Link to="/admin/orders">Discard</Link>
          </Button>
          <Button
            size="lg"
            disabled={!canCreate}
            className="h-9 px-5 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-40"
          >
            Create order
          </Button>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* ── Left: product search + line items + note ──────────────────── */}
        <div className="space-y-5">
          {/* Product search */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Add products
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ProductSearch onAdd={addItem} />
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="overflow-hidden gap-0 py-0">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-semibold">Line items</p>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center border-t py-12 text-center">
                <PackageIcon className="mb-3 h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm font-medium text-muted-foreground">
                  No items yet
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Search for products above to add them.
                </p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="flex items-center gap-3 border-t border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
                  <span className="flex-1">Product</span>
                  <span className="w-24 text-right">Unit price</span>
                  <span className="w-28 text-center">Qty</span>
                  <span className="w-16 text-right">Total</span>
                  <span className="w-7 shrink-0" />
                </div>

                {/* Rows */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border/50 px-5 py-3.5 last:border-0"
                  >
                    {/* Product info */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br",
                          item.gradient,
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-snug">
                          {item.product}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.variant && `${item.variant} · `}
                          <span className="font-mono">{item.sku}</span>
                        </p>
                      </div>
                    </div>

                    {/* Unit price */}
                    <div className="relative w-24 shrink-0">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        value={item.unitPrice}
                        onChange={(e) => setPrice(item.id, e.target.value)}
                        className="h-8 pl-5 text-right text-sm tabular-nums"
                      />
                    </div>

                    {/* Qty stepper */}
                    <div className="flex w-28 shrink-0 justify-center">
                      <div className="flex items-center overflow-hidden rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 border-x border-border text-center text-sm tabular-nums leading-8">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty + 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                      ${(item.qty * item.unitPrice).toFixed(2)}
                    </span>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* Note */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Note</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Internal note — not visible to the customer…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Right: customer, address, shipping, payment, summary ──────── */}
        <div className="space-y-5">
          {/* Customer */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Customer</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {customer ? (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomer(null)}
                    className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                    onFocus={() => setCustFocused(true)}
                    onBlur={() => setTimeout(() => setCustFocused(false), 120)}
                    placeholder="Search by name or email…"
                    className="h-9 pl-8 text-sm"
                  />
                  {custFocused && custQuery.length > 0 && (
                    <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                      {custResults.length > 0 ? (
                        custResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectCustomer(c)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.email}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-5 text-center">
                          <p className="text-sm text-muted-foreground">
                            No customers found.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Shipping address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full name</Label>
                <Input
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Recipient name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ZIP / Postal</Label>
                  <Input
                    value={addrZip}
                    onChange={(e) => setAddrZip(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Region / State</Label>
                  <Input
                    value={addrRegion}
                    onChange={(e) => setAddrRegion(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Input
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping method */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Shipping method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {SHIPPING_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setShipping(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                    shipping === m.id
                      ? "border-amber-400 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      shipping === m.id
                        ? "border-amber-500"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {shipping === m.id && (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {m.price === 0 ? "Free" : `$${m.price.toFixed(2)}`}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Toggle */}
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["paid", "invoice"] as const).map((type, i) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
                      i > 0 && "border-l border-border",
                      paymentType === type
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {type === "paid" ? (
                      <>
                        <CreditCardIcon className="h-3.5 w-3.5" /> Mark as paid
                      </>
                    ) : (
                      <>
                        <FileTextIcon className="h-3.5 w-3.5" /> Send invoice
                      </>
                    )}
                  </button>
                ))}
              </div>

              {paymentType === "paid" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment method
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank transfer
                      </SelectItem>
                      <SelectItem value="card_manual">
                        Card (manual entry)
                      </SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    An invoice will be emailed to{" "}
                    <span className="font-medium text-foreground">
                      {customer?.email ?? "the customer"}
                    </span>{" "}
                    with a payment link. The order will be created in{" "}
                    <em>pending</em> status until payment is received.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order summary */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Discount */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <TagIcon className="h-3 w-3" />
                  Discount code
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value);
                      setDiscountError("");
                      if (appliedDiscount) setAppliedDiscount(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
                    placeholder="e.g. SUMMER20"
                    className="h-8 flex-1 font-mono text-sm uppercase"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!discountCode.trim()}
                    onClick={applyDiscount}
                  >
                    Apply
                  </Button>
                </div>
                {appliedDiscount && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span>{appliedDiscount.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedDiscount(null);
                        setDiscountCode("");
                      }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {discountError && (
                  <p className="text-xs text-destructive">{discountError}</p>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    {shippingCost === 0
                      ? "Free"
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      −${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (GST 6%)</span>
                  <span className="tabular-nums">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-40"
                disabled={!canCreate}
              >
                Create order
              </Button>

              {!canCreate && (
                <p className="text-center text-xs text-muted-foreground">
                  {items.length === 0
                    ? "Add at least one product to continue."
                    : "Select a customer to continue."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
