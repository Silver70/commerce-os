import { queryOptions } from "@tanstack/react-query";
import type { ProductFilter } from "~/types/api";
import {
  getCategoriesServerFn,
  getCategoryBySlugServerFn,
  getProductsServerFn,
  getProductServerFn,
} from "./server";

export interface ProductsParams {
  first?: number;
  after?: string;
  filter?: ProductFilter;
}

export const productsQueryOptions = (params: ProductsParams = {}) =>
  queryOptions({
    queryKey: ["products", params],
    queryFn: () => getProductsServerFn({ data: params }),
    // Catalog data is fairly static — keep it fresh-enough without refetching
    // on every navigation.
    staleTime: 60_000,
  });

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductServerFn({ data: { slug } }),
    staleTime: 60_000,
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => getCategoriesServerFn(),
    staleTime: 5 * 60_000,
  });

export const categoryBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlugServerFn({ data: { slug } }),
    staleTime: 5 * 60_000,
  });
