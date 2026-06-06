import { createFileRoute } from "@tanstack/react-router";
import { productsQueryOptions } from "~/features/products/queries";
import { ProductListPage } from "~/features/products/pages/product-list-page";

export const Route = createFileRoute("/admin/products_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(productsQueryOptions()),
  component: ProductListPage,
});
