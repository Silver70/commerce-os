import { queryOptions } from "@tanstack/react-query";
import { getCustomersServerFn } from "~/server/customers";
import type { CustomerStatus } from "~/types/api";

export const customersQueryOptions = (params: { status?: CustomerStatus; cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["customers", params],
    queryFn: () => getCustomersServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
