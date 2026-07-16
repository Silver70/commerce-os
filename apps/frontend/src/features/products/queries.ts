import { queryOptions } from "@tanstack/react-query";
import {
  getCategoriesServerFn,
  getProductByIdServerFn,
  getProductsServerFn,
} from "./server";
import type { ProductStatus } from "~/types/api";

export const productsQueryOptions = (
  params: {
    status?: ProductStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) =>
  queryOptions({
    queryKey: ["products", params],
    queryFn: () => getProductsServerFn({ data: params }),
    staleTime: 30 * 1000,
  });

export const productQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: ["products", productId],
    queryFn: () => getProductByIdServerFn({ data: { productId } }),
    staleTime: 30 * 1000,
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => getCategoriesServerFn(),
    staleTime: 5 * 60 * 1000,
  });
