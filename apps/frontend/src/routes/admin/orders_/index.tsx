import { createFileRoute } from "@tanstack/react-router";
import { ordersQueryOptions } from "~/features/orders/queries";
import { OrderListPage } from "~/features/orders/pages/order-list-page";
import { PAGE_SIZE } from "~/types/api";

export const Route = createFileRoute("/admin/orders_/")({
  // Must match the page's initial query params exactly, or the key differs and
  // this prefetch is thrown away.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      ordersQueryOptions({ page: 1, limit: PAGE_SIZE }),
    ),
  component: OrderListPage,
});
