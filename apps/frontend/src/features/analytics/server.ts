import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type {
  SalesAnalytics,
  OrdersAnalytics,
  CustomersAnalytics,
  InventoryAnalytics,
  TrafficAnalytics,
} from "~/types/api";

const periodInput = z.object({
  period: z.enum(["today", "7d", "30d", "90d"]),
});

async function getJson<T>(path: string): Promise<T> {
  try {
    const res = await apiClient.get<T>(path, {
      headers: { ...(await authHeader()), ...adminStoreHeader() },
    });
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

export const getSalesAnalyticsServerFn = createServerFn({ method: "GET" })
  .inputValidator(periodInput)
  .handler(({ data }): Promise<SalesAnalytics> =>
    getJson(`/api/admin/analytics/sales?period=${data.period}`),
  );

export const getOrdersAnalyticsServerFn = createServerFn({ method: "GET" })
  .inputValidator(periodInput)
  .handler(({ data }): Promise<OrdersAnalytics> =>
    getJson(`/api/admin/analytics/orders?period=${data.period}`),
  );

export const getCustomersAnalyticsServerFn = createServerFn({ method: "GET" })
  .inputValidator(periodInput)
  .handler(({ data }): Promise<CustomersAnalytics> =>
    getJson(`/api/admin/analytics/customers?period=${data.period}`),
  );

export const getInventoryAnalyticsServerFn = createServerFn({
  method: "GET",
}).handler((): Promise<InventoryAnalytics> =>
  getJson(`/api/admin/analytics/inventory`),
);

export const getTrafficAnalyticsServerFn = createServerFn({ method: "GET" })
  .inputValidator(periodInput)
  .handler(({ data }): Promise<TrafficAnalytics> =>
    getJson(`/api/admin/analytics/traffic?period=${data.period}`),
  );
