import { createFileRoute } from "@tanstack/react-router";
import { OrderNewPage } from "~/features/orders/pages/order-new-page";

export const Route = createFileRoute("/admin/orders_/new")({
  component: OrderNewPage,
});
