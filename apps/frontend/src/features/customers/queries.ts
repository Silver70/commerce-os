import { queryOptions } from "@tanstack/react-query";
import {
  getCustomersServerFn,
  getCustomerByIdServerFn,
  getCustomerAddressesServerFn,
} from "./server";
import type { CustomerStatus } from "~/types/api";

export const customersQueryOptions = (
  params: {
    status?: CustomerStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
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

export const customerAddressesQueryOptions = (customerId: string) =>
  queryOptions({
    queryKey: ["customers", customerId, "addresses"],
    queryFn: () => getCustomerAddressesServerFn({ data: { customerId } }),
    staleTime: 30 * 1000,
  });
