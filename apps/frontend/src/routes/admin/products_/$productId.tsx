import { createFileRoute } from "@tanstack/react-router";
import { productQueryOptions } from "~/features/products/queries";
import { ProductDetailPage } from "~/features/products/pages/product-detail-page";

export const Route = createFileRoute("/admin/products_/$productId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueryOptions(params.productId)),
  component: ProductDetailPage,
});
