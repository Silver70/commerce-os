import { queryOptions } from "@tanstack/react-query";
import { getDashboardStatsServerFn } from "~/server/dashboard";
import type { Period } from "~/types/api";

export const dashboardStatsQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ["dashboard", "stats", period],
    queryFn: () => getDashboardStatsServerFn({ data: { period } }),
    staleTime: 60 * 1000,
  });
