import { createFileRoute } from "@tanstack/react-router";
import { shippingZonesQueryOptions } from "~/features/shipping/queries";
import { ShippingPage } from "~/features/shipping/pages/shipping-page";

export const Route = createFileRoute("/admin/shipping")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(shippingZonesQueryOptions()),
  component: ShippingPage,
});
