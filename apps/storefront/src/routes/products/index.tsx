import { createFileRoute } from "@tanstack/react-router";
import {
  categoriesQueryOptions,
  productsQueryOptions,
} from "~/features/catalog/queries";
import { findCategoryBySlug } from "~/features/catalog/utils";
import { ProductListPage } from "~/features/catalog/pages/product-list-page";

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ context, deps }) => {
    const categories = await context.queryClient.ensureQueryData(
      categoriesQueryOptions(),
    );
    const category = deps.category
      ? findCategoryBySlug(categories, deps.category)
      : undefined;
    await context.queryClient.ensureQueryData(
      productsQueryOptions({
        filter: category ? { categoryId: category.id } : undefined,
        first: 24,
      }),
    );
  },
  component: ProductListPage,
});
