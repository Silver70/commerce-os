import { createFileRoute } from "@tanstack/react-router";
import { productsQueryOptions } from "~/features/products/queries";
import { ProductListPage } from "~/features/products/pages/product-list-page";
import { PAGE_SIZE } from "~/types/api";

export const Route = createFileRoute("/admin/products_/")({
  // Must match the page's initial query params exactly, or the key differs and
  // this prefetch is thrown away.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      productsQueryOptions({ page: 1, limit: PAGE_SIZE }),
    ),
  component: ProductListPage,
});
