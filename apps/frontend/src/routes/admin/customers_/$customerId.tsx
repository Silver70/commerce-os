import { createFileRoute } from "@tanstack/react-router";
import { customerQueryOptions } from "~/features/customers/queries";
import { CustomerDetailPage } from "~/features/customers/pages/customer-detail-page";

export const Route = createFileRoute("/admin/customers_/$customerId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      customerQueryOptions(params.customerId),
    ),
  component: CustomerDetailPage,
});
