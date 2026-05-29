import { queryOptions } from "@tanstack/react-query";
import { getOrdersServerFn } from "~/server/orders";
import type { OrderStatus } from "~/types/api";

export const ordersQueryOptions = (params: { status?: OrderStatus; cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["orders", params],
    queryFn: () => getOrdersServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
