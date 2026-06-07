import { queryOptions } from "@tanstack/react-query";
import { getInventoryServerFn } from "./server";

export const inventoryQueryOptions = (params: { lowStock?: boolean; cursor?: string } = {}) =>
  queryOptions({
    queryKey: ["inventory", params],
    queryFn: () => getInventoryServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
