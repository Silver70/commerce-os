import { createFileRoute } from "@tanstack/react-router";
import { customersQueryOptions } from "~/features/customers/queries";
import { CustomerListPage } from "~/features/customers/pages/customer-list-page";
import { PAGE_SIZE } from "~/types/api";

export const Route = createFileRoute("/admin/customers_/")({
  // Must match the page's initial query params exactly, or the key differs and
  // this prefetch is thrown away.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      customersQueryOptions({ page: 1, limit: PAGE_SIZE }),
    ),
  component: CustomerListPage,
});
