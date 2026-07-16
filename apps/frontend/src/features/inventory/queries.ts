import { queryOptions } from "@tanstack/react-query";
import { getInventoryServerFn } from "./server";

export const inventoryQueryOptions = (
  params: {
    status?: "low" | "out";
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) =>
  queryOptions({
    queryKey: ["inventory", params],
    queryFn: () => getInventoryServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
