import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gqlFetch } from "~/lib/gql-client";
import type { Category, Product, ProductConnection } from "~/types/api";
import {
  CATEGORIES_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  PRODUCT_QUERY,
  PRODUCTS_QUERY,
} from "./graphql";

const productFilterSchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  vendor: z.string().optional(),
});

export const getProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      first: z.number().int().positive().max(100).optional(),
      after: z.string().optional(),
      filter: productFilterSchema.optional(),
    }),
  )
  .handler(async ({ data }): Promise<ProductConnection> => {
    const res = await gqlFetch<{ products: ProductConnection }>(
      PRODUCTS_QUERY,
      {
        first: data.first ?? 24,
        after: data.after,
        filter: data.filter,
      },
    );
    return res.products;
  });

export const getProductServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }): Promise<Product | null> => {
    const res = await gqlFetch<{ product: Product | null }>(PRODUCT_QUERY, {
      slug: data.slug,
    });
    return res.product;
  });

export const getCategoriesServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Category[]> => {
    const res = await gqlFetch<{ categories: Category[] }>(CATEGORIES_QUERY);
    return res.categories;
  },
);

export const getCategoryBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }): Promise<Category | null> => {
    const res = await gqlFetch<{ category: Category | null }>(
      CATEGORY_BY_SLUG_QUERY,
      { slug: data.slug },
    );
    return res.category;
  });
