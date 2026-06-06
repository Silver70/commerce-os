import { createFileRoute } from "@tanstack/react-router";
import { ordersQueryOptions } from "~/features/orders/queries";
import { OrderListPage } from "~/features/orders/pages/order-list-page";

export const Route = createFileRoute("/admin/orders_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(ordersQueryOptions()),
  component: OrderListPage,
});
