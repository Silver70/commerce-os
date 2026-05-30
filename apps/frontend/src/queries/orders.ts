import { queryOptions } from "@tanstack/react-query";
import { getOrdersServerFn, getOrderByIdServerFn } from "~/server/orders";
import type { OrderStatus } from "~/types/api";

export const ordersQueryOptions = (params: { status?: OrderStatus; customerId?: string; cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["orders", params],
    queryFn: () => getOrdersServerFn({ data: params }),
    staleTime: 30 * 1000,
  });

export const orderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: ["orders", orderId],
    queryFn: () => getOrderByIdServerFn({ data: { orderId } }),
    staleTime: 30 * 1000,
  });
