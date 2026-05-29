import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { InventoryItem, PaginatedResponse } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getInventoryServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      lowStock: z.boolean().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PaginatedResponse<InventoryItem>> => {
    const params = new URLSearchParams();
    if (data.lowStock) params.set("lowStock", "true");
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const endpoint = data.lowStock
        ? `/api/admin/inventory/low-stock?${params.toString()}`
        : `/api/admin/inventory?${params.toString()}`;
      const res = await apiClient.get<PaginatedResponse<InventoryItem>>(endpoint, {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const adjustInventoryServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      variantId: z.string().min(1),
      delta: z.number().int(),
      reason: z.string().min(1, "Reason is required"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<InventoryItem> => {
    try {
      const { variantId, ...body } = data;
      const res = await apiClient.patch<InventoryItem>(
        `/api/admin/inventory/${variantId}`,
        body,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
