import { ImageOff } from "lucide-react";
import type { Cart, ShippingRate } from "~/types/api";
import { formatMoney } from "~/lib/money";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

interface OrderSummaryProps {
  cart: Cart;
  /** The chosen shipping rate, once selected. */
  shippingRate?: ShippingRate | null;
}

/** Read-only order recap shown alongside the checkout form. */
export function OrderSummary({ cart, shippingRate }: OrderSummaryProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h2 className="font-heading text-base font-medium">Order summary</h2>

      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-4" />
                </div>
              )}
              <span className="absolute -top-1 -right-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.productName}</p>
              {item.variantName && (
                <p className="text-xs text-muted-foreground">
                  {item.variantName}
                </p>
              )}
            </div>
            <span className="text-sm">
              {formatMoney(item.totalPrice, cart.currency)}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-1.5 text-sm">
        <Row
          label="Subtotal"
          value={formatMoney(cart.subtotal, cart.currency)}
        />
        {cart.discountAmount > 0 && (
          <Row
            muted
            label={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ""}`}
            value={`−${formatMoney(cart.discountAmount, cart.currency)}`}
          />
        )}
        <Row
          muted={!shippingRate}
          label="Shipping"
          value={
            shippingRate
              ? shippingRate.price === 0
                ? "Free"
                : formatMoney(shippingRate.price, cart.currency)
              : "Calculated at next step"
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Taxes are calculated at payment.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
