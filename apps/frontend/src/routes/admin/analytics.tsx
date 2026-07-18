import { createFileRoute } from "@tanstack/react-router";
import { salesAnalyticsQueryOptions } from "~/features/analytics/queries";
import { AnalyticsPage } from "~/features/analytics/pages/analytics-page";

export const Route = createFileRoute("/admin/analytics")({
  // Prefetch the default tab (Sales) for the page's default period so the first
  // paint is instant; other tabs load lazily when opened.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(salesAnalyticsQueryOptions("30d")),
  component: AnalyticsPage,
});
