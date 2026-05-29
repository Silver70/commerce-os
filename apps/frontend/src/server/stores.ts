import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Store } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

// ─── List Stores ──────────────────────────────────────────────────────────────

export const getStoresServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Store[]> => {
    try {
      const res = await apiClient.get<Store[]>("/api/admin/stores", {
        headers: { cookie: incomingCookie() },
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

// ─── Update Store ─────────────────────────────────────────────────────────────

export const updateStoreServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      storeId: z.string().min(1),
      name: z.string().min(2, "Store name must be at least 2 characters"),
      currency: z.string().length(3, "Currency must be a 3-letter code"),
      timezone: z.string().min(1, "Timezone is required"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { storeId, ...body } = data;
      const res = await apiClient.patch<Store>(
        `/api/admin/stores/${storeId}`,
        body,
        {
          headers: {
            cookie: incomingCookie(),
            ...adminStoreHeader(),
          },
        },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Set Active Store ─────────────────────────────────────────────────────────

export const setActiveStoreServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ storeId: z.string().min(1) }))
  .handler(async ({ data }) => {
    setResponseHeader(
      "set-cookie",
      `wos-active-store=${data.storeId}; Path=/; SameSite=Lax`,
    );
  });
