import { createFileRoute } from "@tanstack/react-router";
import { DiscountNewPage } from "~/features/discounts/pages/discount-new-page";

export const Route = createFileRoute("/admin/discounts_/new")({
  component: DiscountNewPage,
});
