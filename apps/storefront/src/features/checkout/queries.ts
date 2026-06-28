import { queryOptions } from "@tanstack/react-query";
import { getOrderStatusServerFn, getShippingRatesServerFn } from "./server";

export const shippingRatesQueryOptions = (params: {
  countryCode: string;
  orderSubtotal: number;
}) =>
  queryOptions({
    queryKey: ["shipping-rates", params],
    queryFn: () => getShippingRatesServerFn({ data: params }),
    staleTime: 5 * 60_000,
  });

export const orderStatusQueryOptions = (orderNumber: string) =>
  queryOptions({
    queryKey: ["order-status", orderNumber],
    queryFn: () => getOrderStatusServerFn({ data: { orderNumber } }),
    staleTime: 0,
  });
