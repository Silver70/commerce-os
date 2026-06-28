import { createFileRoute } from "@tanstack/react-router";
import { cartQueryOptions } from "~/features/cart/queries";
import { CartPage } from "~/features/cart/pages/cart-page";

export const Route = createFileRoute("/cart")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(cartQueryOptions()),
  component: CartPage,
});
