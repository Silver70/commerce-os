import { createFileRoute } from "@tanstack/react-router";
import { ProductNewPage } from "~/features/products/pages/product-new-page";

export const Route = createFileRoute("/admin/products_/new")({
  component: ProductNewPage,
});
