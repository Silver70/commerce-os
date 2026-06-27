import { createFileRoute, notFound } from "@tanstack/react-router";
import { productQueryOptions } from "~/features/catalog/queries";
import { ProductDetailPage } from "~/features/catalog/pages/product-detail-page";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(
      productQueryOptions(params.slug),
    );
    if (!product) throw notFound();
  },
  component: ProductDetailPage,
});
