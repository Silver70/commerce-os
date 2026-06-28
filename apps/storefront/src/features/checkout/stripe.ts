/// <reference types="vite/client" />
import { loadStripe, type Stripe } from "@stripe/stripe-js";

/** The browser-safe Stripe publishable key (build-time env). */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env
  .VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Lazily load Stripe.js once (browser only). Returns a promise of `null` when
 * the publishable key isn't configured, so callers can render a clear message
 * instead of crashing.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = STRIPE_PUBLISHABLE_KEY
      ? loadStripe(STRIPE_PUBLISHABLE_KEY)
      : Promise.resolve(null);
  }
  return stripePromise;
}
