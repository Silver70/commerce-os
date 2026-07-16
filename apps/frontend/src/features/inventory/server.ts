import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type {
  InventoryItem,
  InventoryItemView,
  InventoryResponse,
} from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
}

export const getInventoryServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z.enum(["low", "out"]).optional(),
      search: z.string().optional(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<InventoryResponse> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.search) params.set("search", data.search);
    params.set("page", String(data.page ?? 1));
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<InventoryResponse>(
        `/api/admin/inventory?${params.toString()}`,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const adjustInventoryServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      variantId: z.string().min(1),
      adjustment: z.number().int(),
      reason: z.string().min(1, "Reason is required"),
      reference: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<InventoryItem> => {
    try {
      const { variantId, ...body } = data;
      const res = await apiClient.patch<InventoryItem>(
        `/api/admin/inventory/${variantId}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
