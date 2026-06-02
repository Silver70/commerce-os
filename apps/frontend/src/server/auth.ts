import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";

// ─── Org Bootstrap (first-login) ──────────────────────────────────────────────

export const bootstrapOrgServerFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ workosOrgId: string }> => {
    try {
      const res = await apiClient.post<{ workosOrgId: string }>(
        "/api/auth/bootstrap",
        {},
        { headers: await authHeader() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const createApiKeyServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1, "Key name is required") }))
  .handler(
    async ({ data }): Promise<import("~/types/api").ApiKeyWithSecret> => {
      const storeId = getCookie("wos-active-store");
      if (!storeId)
        throw new Error("No active store — complete onboarding step 1 first");
      try {
        const res = await apiClient.post<
          import("~/types/api").ApiKeyWithSecret
        >(`/api/admin/stores/${storeId}/api-keys`, data, {
          headers: { ...(await authHeader()), "X-Store-Id": storeId },
        });
        return res.data;
      } catch (err) {
        throw new Error(getErrorMessage(err));
      }
    },
  );
