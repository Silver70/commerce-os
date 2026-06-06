import { createFileRoute } from "@tanstack/react-router";
import { customersQueryOptions } from "~/features/customers/queries";
import { CustomerListPage } from "~/features/customers/pages/customer-list-page";

export const Route = createFileRoute("/admin/customers_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(customersQueryOptions()),
  component: CustomerListPage,
});
