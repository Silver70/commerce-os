import { queryOptions } from "@tanstack/react-query";
import { getDiscountsServerFn } from "~/server/discounts";

export const discountsQueryOptions = (params: { cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["discounts", params],
    queryFn: () => getDiscountsServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
