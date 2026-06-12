import { createFileRoute } from "@tanstack/react-router";
import { PriceListNewPage } from "~/features/price-lists/pages/price-list-new-page";

export const Route = createFileRoute("/admin/price-lists_/new")({
  component: PriceListNewPage,
});
