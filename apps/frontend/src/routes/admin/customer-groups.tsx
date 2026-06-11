import { createFileRoute } from "@tanstack/react-router";
import { customerGroupsQueryOptions } from "~/features/customer-groups/queries";
import { CustomerGroupsPage } from "~/features/customer-groups/pages/customer-groups-page";

export const Route = createFileRoute("/admin/customer-groups")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(customerGroupsQueryOptions()),
  component: CustomerGroupsPage,
});
