import * as React from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "~/components/ui/button";

/**
 * Stripe Payment Element + confirm. On success Stripe redirects the browser to
 * the confirmation page (return_url); we only land back here on error.
 */
export function StripePaymentForm({ orderNumber }: { orderNumber: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/confirmation?orderNumber=${encodeURIComponent(orderNumber)}`,
      },
    });

    // Reached only when confirmation fails before the redirect.
    if (stripeError) {
      setError(stripeError.message ?? "Payment could not be completed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || submitting}
      >
        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </form>
  );
}
