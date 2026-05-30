import { queryOptions } from "@tanstack/react-query";
import {
  getShippingZonesServerFn,
  getShippingMethodsServerFn,
} from "~/server/shipping";

export const shippingZonesQueryOptions = () =>
  queryOptions({
    queryKey: ["shipping", "zones"],
    queryFn: () => getShippingZonesServerFn(),
    staleTime: 30 * 1000,
  });

export const shippingMethodsQueryOptions = (zoneId?: string) =>
  queryOptions({
    queryKey: ["shipping", "methods", zoneId ?? "all"],
    queryFn: () => getShippingMethodsServerFn({ data: { zoneId } }),
    staleTime: 30 * 1000,
  });
