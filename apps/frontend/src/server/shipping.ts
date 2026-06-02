import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { ShippingMethod, ShippingZone } from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
}

// ─── Get Shipping Zones ───────────────────────────────────────────────────────

export const getShippingZonesServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const res = await apiClient.get<ShippingZone[]>(
      "/api/admin/shipping/zones",
      {
        headers: await storeHeaders(),
      },
    );
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
});

// ─── Get Shipping Methods ─────────────────────────────────────────────────────

export const getShippingMethodsServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ zoneId: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const params = data.zoneId ? `?zoneId=${data.zoneId}` : "";
      const res = await apiClient.get<ShippingMethod[]>(
        `/api/admin/shipping/methods${params}`,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

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
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Update Shipping Zone ─────────────────────────────────────────────────────

export const updateShippingZoneServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      countries: z.array(z.string()).optional(),
      isDefault: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    try {
      const res = await apiClient.patch<ShippingZone>(
        `/api/admin/shipping/zones/${id}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Delete Shipping Zone ─────────────────────────────────────────────────────

export const deleteShippingZoneServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(`/api/admin/shipping/zones/${data.id}`, {
        headers: await storeHeaders(),
      });
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
      estimatedDaysMin: z.number().int().nonnegative().optional(),
      estimatedDaysMax: z.number().int().nonnegative().optional(),
      isActive: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post<ShippingMethod>(
        "/api/admin/shipping/methods",
        data,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Update Shipping Method ───────────────────────────────────────────────────

export const updateShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      rateType: z.enum(["flat_rate", "free", "calculated"]).optional(),
      price: z.number().int().nonnegative().optional(),
      minOrderAmount: z.number().int().nonnegative().optional(),
      estimatedDaysMin: z.number().int().nonnegative().optional(),
      estimatedDaysMax: z.number().int().nonnegative().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    try {
      const res = await apiClient.patch<ShippingMethod>(
        `/api/admin/shipping/methods/${id}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Delete Shipping Method ───────────────────────────────────────────────────

export const deleteShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(`/api/admin/shipping/methods/${data.id}`, {
        headers: await storeHeaders(),
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
