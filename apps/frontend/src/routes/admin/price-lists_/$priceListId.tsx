import { createFileRoute } from "@tanstack/react-router";
import { priceListQueryOptions } from "~/features/price-lists/queries";
import { PriceListDetailPage } from "~/features/price-lists/pages/price-list-detail-page";

export const Route = createFileRoute("/admin/price-lists_/$priceListId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      priceListQueryOptions(params.priceListId),
    ),
  component: RouteComponent,
});

function RouteComponent() {
  const { priceListId } = Route.useParams();
  return <PriceListDetailPage priceListId={priceListId} />;
}
