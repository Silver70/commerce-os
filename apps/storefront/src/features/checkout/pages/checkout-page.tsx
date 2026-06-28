import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Elements } from "@stripe/react-stripe-js";
import { z } from "zod";
import type { Cart, ShippingRate } from "~/types/api";
import { Button } from "~/components/ui/button";
import { useCart } from "~/features/cart/hooks";
import { ShippingAddressForm } from "../components/shipping-address-form";
import { ShippingRatePicker } from "../components/shipping-rate-picker";
import { OrderSummary } from "../components/order-summary";
import { StripePaymentForm } from "../components/stripe-payment-form";
import { shippingRatesQueryOptions } from "../queries";
import { createCheckoutServerFn } from "../server";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "../stripe";
import {
  emptyShippingAddress,
  type ShippingAddressErrors,
  type ShippingAddressFormState,
} from "../types";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  company: z.string().optional(),
  line1: z.string().min(1, "Required"),
  line2: z.string().optional(),
  city: z.string().min(1, "Required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Required"),
  countryCode: z.string().length(2, "Use a 2-letter code"),
  phone: z.string().optional(),
});

interface CheckoutState {
  clientSecret: string;
  orderNumber: string;
}

export function CheckoutPage() {
  const { data: cart } = useCart();
  const [form, setForm] =
    React.useState<ShippingAddressFormState>(emptyShippingAddress);
  const [errors, setErrors] = React.useState<ShippingAddressErrors>({});
  const [shippingMethodId, setShippingMethodId] = React.useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkout, setCheckout] = React.useState<CheckoutState | null>(null);
  // Generated on first submit (client-side) and stable across retries so the
  // backend can dedupe (forward-compatible).
  const idempotencyKey = React.useRef<string | null>(null);

  const subtotal = cart?.subtotal ?? 0;
  const countryReady = form.countryCode.trim().length === 2;
  const ratesQuery = useQuery({
    ...shippingRatesQueryOptions({
      countryCode: form.countryCode.toUpperCase(),
      orderSubtotal: subtotal,
    }),
    enabled: countryReady && subtotal > 0 && !checkout,
  });
  const rates = ratesQuery.data ?? [];
  const selectedRate =
    rates.find((r) => r.methodId === shippingMethodId) ?? null;

  // Clear the chosen method if the new country no longer offers it.
  React.useEffect(() => {
    if (
      shippingMethodId &&
      rates.length > 0 &&
      !rates.some((r) => r.methodId === shippingMethodId)
    ) {
      setShippingMethodId(null);
    }
  }, [rates, shippingMethodId]);

  async function handleContinue() {
    setSubmitError(null);
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: ShippingAddressErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ShippingAddressFormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (!shippingMethodId) {
      setSubmitError("Select a shipping method.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const { email, ...address } = parsed.data;
      const result = await createCheckoutServerFn({
        data: {
          shippingAddress: address,
          shippingMethodId,
          email,
          idempotencyKey: idempotencyKey.current,
        },
      });
      setCheckout({
        clientSecret: result.paymentClientSecret,
        orderNumber: result.orderNumber,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  // beforeLoad redirects an empty cart to /cart; this is just a guard.
  if (!cart || cart.items.length === 0) return null;

  if (checkout) {
    return (
      <CheckoutLayout cart={cart} selectedRate={selectedRate}>
        <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
          Payment
        </h1>
        {STRIPE_PUBLISHABLE_KEY ? (
          <Elements
            stripe={getStripe()}
            options={{ clientSecret: checkout.clientSecret }}
          >
            <StripePaymentForm orderNumber={checkout.orderNumber} />
          </Elements>
        ) : (
          <p className="text-sm text-destructive">
            Payments aren’t configured — set VITE_STRIPE_PUBLISHABLE_KEY.
          </p>
        )}
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout cart={cart} selectedRate={selectedRate}>
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Checkout
      </h1>
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Contact &amp; shipping
          </h2>
          <ShippingAddressForm
            value={form}
            errors={errors}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Shipping method
          </h2>
          <ShippingRatePicker
            rates={rates}
            selectedId={shippingMethodId}
            onSelect={setShippingMethodId}
            currency={cart.currency}
            isLoading={ratesQuery.isFetching && rates.length === 0}
          />
        </section>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleContinue}
          disabled={submitting}
        >
          {submitting ? "Processing…" : "Continue to payment"}
        </Button>
      </div>
    </CheckoutLayout>
  );
}

function CheckoutLayout({
  cart,
  selectedRate,
  children,
}: {
  cart: Cart;
  selectedRate: ShippingRate | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem]">
        <div>{children}</div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <OrderSummary cart={cart} shippingRate={selectedRate} />
        </div>
      </div>
    </div>
  );
}
