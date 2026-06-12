import { queryOptions } from "@tanstack/react-query";
import {
  getPriceListByIdServerFn,
  getPriceListsForCustomerServerFn,
  getPriceListsServerFn,
} from "./server";

export const priceListsQueryOptions = () =>
  queryOptions({
    queryKey: ["price-lists"],
    queryFn: () => getPriceListsServerFn(),
    staleTime: 30 * 1000,
  });

export const priceListQueryOptions = (priceListId: string) =>
  queryOptions({
    queryKey: ["price-lists", priceListId],
    queryFn: () => getPriceListByIdServerFn({ data: { priceListId } }),
    staleTime: 30 * 1000,
  });

export const priceListsForCustomerQueryOptions = (customerId: string) =>
  queryOptions({
    queryKey: ["price-lists", "for-customer", customerId],
    queryFn: () => getPriceListsForCustomerServerFn({ data: { customerId } }),
    staleTime: 30 * 1000,
  });
