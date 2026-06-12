import { createFileRoute } from "@tanstack/react-router";
import { priceListsQueryOptions } from "~/features/price-lists/queries";
import { PriceListListPage } from "~/features/price-lists/pages/price-list-list-page";

export const Route = createFileRoute("/admin/price-lists_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(priceListsQueryOptions()),
  component: PriceListListPage,
});
