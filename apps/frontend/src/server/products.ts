import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { PaginatedResponse, Product } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z.enum(["draft", "active", "archived"]).optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<PaginatedResponse<Product>>(
        `/api/admin/products?${params.toString()}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteProductServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(`/api/admin/products/${data.productId}`, {
        headers: storeHeaders(),
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
