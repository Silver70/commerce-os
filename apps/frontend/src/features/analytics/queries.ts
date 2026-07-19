import { queryOptions } from "@tanstack/react-query";
import type { Period } from "~/types/api";
import {
  getSalesAnalyticsServerFn,
  getOrdersAnalyticsServerFn,
  getCustomersAnalyticsServerFn,
  getInventoryAnalyticsServerFn,
  getTrafficAnalyticsServerFn,
  getAudienceAnalyticsServerFn,
  getBehaviorAnalyticsServerFn,
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

export const audienceAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "audience", period],
    queryFn: () => getAudienceAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });

export const behaviorAnalyticsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["analytics", "behavior", period],
    queryFn: () => getBehaviorAnalyticsServerFn({ data: { period } }),
    staleTime: STALE,
  });
