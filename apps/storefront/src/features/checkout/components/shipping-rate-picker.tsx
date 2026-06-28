import type { ShippingRate } from "~/types/api";
import { formatMoney } from "~/lib/money";
import { cn } from "~/lib/utils";

interface ShippingRatePickerProps {
  rates: ShippingRate[];
  selectedId: string | null;
  onSelect: (methodId: string) => void;
  currency: string;
  isLoading?: boolean;
}

export function ShippingRatePicker({
  rates,
  selectedId,
  onSelect,
  currency,
  isLoading,
}: ShippingRatePickerProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading shipping options…</p>
    );
  }
  if (rates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Enter your address to see shipping options.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rates.map((rate) => {
        const selected = rate.methodId === selectedId;
        const eta =
          rate.estimatedDaysMin != null && rate.estimatedDaysMax != null
            ? `${rate.estimatedDaysMin}–${rate.estimatedDaysMax} business days`
            : null;
        return (
          <button
            key={rate.methodId}
            type="button"
            onClick={() => onSelect(rate.methodId)}
            aria-pressed={selected}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              selected
                ? "border-foreground ring-1 ring-foreground"
                : "border-border hover:border-foreground/50",
            )}
          >
            <span>
              <span className="font-medium">{rate.name}</span>
              {eta && (
                <span className="block text-xs text-muted-foreground">
                  {eta}
                </span>
              )}
            </span>
            <span className="font-medium">
              {rate.price === 0 ? "Free" : formatMoney(rate.price, currency)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
