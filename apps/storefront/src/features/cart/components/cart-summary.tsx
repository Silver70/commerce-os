import type { Cart } from "~/types/api";
import { cn } from "~/lib/utils";
import { formatMoney } from "~/lib/money";
import { Separator } from "~/components/ui/separator";

/** Order totals. Tax & shipping are 0 here and computed by the backend at checkout. */
export function CartSummary({ cart }: { cart: Cart }) {
  return (
    <div className="w-full space-y-3">
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
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>Total</span>
        <span>{formatMoney(cart.total, cart.currency)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Taxes &amp; shipping calculated at checkout.
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
