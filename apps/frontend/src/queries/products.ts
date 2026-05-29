import { queryOptions } from "@tanstack/react-query";
import { getProductsServerFn } from "~/server/products";
import type { ProductStatus } from "~/types/api";

export const productsQueryOptions = (params: { status?: ProductStatus; cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["products", params],
    queryFn: () => getProductsServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
