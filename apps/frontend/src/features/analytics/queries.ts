import { queryOptions } from "@tanstack/react-query";
import type { Period } from "~/types/api";
import {
  getSalesAnalyticsServerFn,
  getOrdersAnalyticsServerFn,
  getCustomersAnalyticsServerFn,
  getInventoryAnalyticsServerFn,
  getTrafficAnalyticsServerFn,
} from "./server";

const STALE = 60 * 1000;

export const salesAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "sales", period],
    queryFn: () => getSalesAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });

export const ordersAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "orders", period],
    queryFn: () => getOrdersAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });

export const customersAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "customers", period],
    queryFn: () => getCustomersAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });

export const inventoryAnalyticsQueryOptions = () =>
  queryOptions({
    queryKey: ["analytics", "inventory"],
    queryFn: () => getInventoryAnalyticsServerFn(),
    staleTime: STALE,
  });

export const trafficAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "traffic", period],
    queryFn: () => getTrafficAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });
