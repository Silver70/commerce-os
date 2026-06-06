import { createFileRoute } from "@tanstack/react-router";
import { orderQueryOptions } from "~/features/orders/queries";
import { OrderDetailPage } from "~/features/orders/pages/order-detail-page";

export const Route = createFileRoute("/admin/orders_/$orderId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(orderQueryOptions(params.orderId)),
  component: OrderDetailPage,
});
