import { createFileRoute } from "@tanstack/react-router";
import { discountsQueryOptions } from "~/features/discounts/queries";
import { DiscountListPage } from "~/features/discounts/pages/discount-list-page";

export const Route = createFileRoute("/admin/discounts_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(discountsQueryOptions()),
  component: DiscountListPage,
});
