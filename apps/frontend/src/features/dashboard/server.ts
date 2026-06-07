import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { DashboardStats } from "~/types/api";

export const getDashboardStatsServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ period: z.enum(["today", "7d", "30d", "90d"]) }))
  .handler(async ({ data }): Promise<DashboardStats> => {
    try {
      const res = await apiClient.get<DashboardStats>(
        `/api/admin/dashboard/stats?period=${data.period}`,
        { headers: { ...(await authHeader()), ...adminStoreHeader() } },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
