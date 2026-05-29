import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Organization } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

// ─── Get Organization ─────────────────────────────────────────────────────────

export const getOrganizationServerFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<Organization> => {
  try {
    const res = await apiClient.get<Organization>("/api/admin/organization", {
      headers: { cookie: incomingCookie() },
    });
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
});

// ─── Update Organization ──────────────────────────────────────────────────────

export const updateOrgServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      currency: z.string().length(3, "Currency must be a 3-letter code"),
      timezone: z.string().min(1, "Timezone is required"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.patch<Organization>(
        "/api/admin/organization",
        data,
        { headers: { cookie: incomingCookie() } },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
