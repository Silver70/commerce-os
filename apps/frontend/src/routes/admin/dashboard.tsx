import { createFileRoute } from "@tanstack/react-router";
import type { Period } from "~/types/api";
import { dashboardStatsQueryOptions } from "~/features/dashboard/queries";
import { ordersQueryOptions } from "~/features/orders/queries";
import { DashboardPage } from "~/features/dashboard/pages/dashboard-page";

export const Route = createFileRoute("/admin/dashboard")({
  loaderDeps: ({ search }: { search: Record<string, string> }) => ({
    period: (search.period ?? "7d") as Period,
  }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        dashboardStatsQueryOptions(deps.period),
      ),
      context.queryClient.ensureQueryData(ordersQueryOptions({})),
    ]),
  component: DashboardPage,
});
