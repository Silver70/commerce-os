import { queryOptions } from "@tanstack/react-query";
import { getCustomerGroupsServerFn } from "./server";

export const customerGroupsQueryOptions = () =>
  queryOptions({
    queryKey: ["customer-groups"],
    queryFn: () => getCustomerGroupsServerFn(),
    staleTime: 60 * 1000,
  });
