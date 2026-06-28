import { createFileRoute, redirect } from "@tanstack/react-router";
import { cartQueryOptions } from "~/features/cart/queries";
import { CheckoutPage } from "~/features/checkout/pages/checkout-page";

export const Route = createFileRoute("/checkout")({
  beforeLoad: async ({ context }) => {
    const cart = await context.queryClient.ensureQueryData(cartQueryOptions());
    if (!cart || cart.items.length === 0) {
      throw redirect({ to: "/cart" });
    }
  },
  component: CheckoutPage,
});
