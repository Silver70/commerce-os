import { createFileRoute } from "@tanstack/react-router";
import { homeSections } from "~/config/home-sections";
import {
  categoriesQueryOptions,
  productsQueryOptions,
} from "~/features/catalog/queries";
import { flattenCategories } from "~/features/catalog/utils";
import { HomePage } from "~/features/catalog/pages/home-page";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const categories = await context.queryClient.ensureQueryData(
      categoriesQueryOptions(),
    );
    const flat = flattenCategories(categories);
    await Promise.all(
      homeSections.map((section) => {
        const category = flat.find((c) => c.slug === section.categorySlug);
        if (!category) return undefined;
        return context.queryClient.ensureQueryData(
          productsQueryOptions({
            filter: { categoryId: category.id },
            first: section.limit,
          }),
        );
      }),
    );
  },
  component: HomePage,
});
