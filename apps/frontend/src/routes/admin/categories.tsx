import { createFileRoute } from "@tanstack/react-router";
import { categoriesQueryOptions } from "~/features/products/queries";
import { CategoryListPage } from "~/features/products/pages/category-list-page";

export const Route = createFileRoute("/admin/categories")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  component: CategoryListPage,
});
