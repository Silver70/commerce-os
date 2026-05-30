import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Customer } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getCustomersServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z.enum(["active", "disabled"]).optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Customer[]> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<Customer[]>(
        `/api/admin/customers?${params.toString()}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const getCustomerByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Customer> => {
    try {
      const res = await apiClient.get<Customer>(
        `/api/admin/customers/${data.customerId}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateCustomerStatusServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string().min(1),
      status: z.enum(["active", "disabled"]),
    }),
  )
  .handler(async ({ data }): Promise<Customer> => {
    try {
      const res = await apiClient.patch<Customer>(
        `/api/admin/customers/${data.customerId}/status`,
        { status: data.status },
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
