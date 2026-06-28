import { createFileRoute } from "@tanstack/react-router";
import { OrderConfirmationPage } from "~/features/checkout/pages/order-confirmation-page";

export const Route = createFileRoute("/order/confirmation")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { orderNumber: string } => ({
    orderNumber:
      typeof search.orderNumber === "string" ? search.orderNumber : "",
  }),
  component: OrderConfirmationPage,
});
