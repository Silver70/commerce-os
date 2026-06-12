import { queryOptions } from "@tanstack/react-query";
import { getCustomersServerFn, getCustomerByIdServerFn } from "./server";
import type { CustomerStatus } from "~/types/api";

export const customersQueryOptions = (
  params: { status?: CustomerStatus; limit?: number } = {},
) =>
  queryOptions({
    queryKey: ["customers", params],
    queryFn: () => getCustomersServerFn({ data: params }),
    staleTime: 30 * 1000,
  });

export const customerQueryOptions = (customerId: string) =>
  queryOptions({
    queryKey: ["customers", customerId],
    queryFn: () => getCustomerByIdServerFn({ data: { customerId } }),
    staleTime: 30 * 1000,
  });
