import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Discount, PaginatedResponse } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getDiscountsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PaginatedResponse<Discount>> => {
    const params = new URLSearchParams();
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<PaginatedResponse<Discount>>(
        `/api/admin/discounts?${params.toString()}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteDiscountServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ discountId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(`/api/admin/discounts/${data.discountId}`, {
        headers: storeHeaders(),
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
