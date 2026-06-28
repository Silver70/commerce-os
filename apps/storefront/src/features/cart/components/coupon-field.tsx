import * as React from "react";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useCartMutations } from "../hooks";

/** Apply / remove a coupon code. The backend validates and reprices the cart. */
export function CouponField({ appliedCode }: { appliedCode?: string | null }) {
  const { applyCoupon, removeCoupon } = useCartMutations();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
        <span>
          Coupon <span className="font-medium">{appliedCode}</span> applied
        </span>
        <button
          type="button"
          aria-label="Remove coupon"
          disabled={removeCoupon.isPending}
          onClick={() => removeCoupon.mutate()}
          className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const submit = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    applyCoupon.mutate(
      { code: trimmed },
      {
        onSuccess: () => setCode(""),
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Invalid coupon"),
      },
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          variant="outline"
          onClick={submit}
          disabled={applyCoupon.isPending || !code.trim()}
        >
          {applyCoupon.isPending ? "Applying…" : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
