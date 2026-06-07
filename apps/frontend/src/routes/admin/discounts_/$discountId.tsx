import { createFileRoute } from "@tanstack/react-router";
import { discountQueryOptions } from "~/features/discounts/queries";
import { DiscountDetailPage } from "~/features/discounts/pages/discount-detail-page";

export const Route = createFileRoute("/admin/discounts_/$discountId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      discountQueryOptions(params.discountId),
    ),
  component: DiscountDetailPage,
});
