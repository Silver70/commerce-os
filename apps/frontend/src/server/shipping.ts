import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { ShippingMethod, ShippingZone } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

// ─── Create Shipping Zone ─────────────────────────────────────────────────────

export const createShippingZoneServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1, "Zone name is required"),
      countries: z.array(z.string()).min(1, "At least one country is required"),
      isDefault: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post<ShippingZone>(
        "/api/admin/shipping/zones",
        data,
        { headers: { cookie: incomingCookie() } },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Create Shipping Method ───────────────────────────────────────────────────

export const createShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      zoneId: z.string().min(1),
      name: z.string().min(1, "Method name is required"),
      rateType: z.enum(["flat_rate", "free", "calculated"]),
      price: z.number().int().nonnegative(),
      minOrderAmount: z.number().int().nonnegative().optional(),
      isActive: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post<ShippingMethod>(
        "/api/admin/shipping/methods",
        data,
        { headers: { cookie: incomingCookie() } },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
