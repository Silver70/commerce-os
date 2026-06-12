import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type {
  Customer,
  CustomerAddress,
  CreatedCustomerResult,
  SetPasswordLinkResult,
} from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
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
        { headers: await storeHeaders() },
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
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      groupId: z.string().optional(),
      marketingOptIn: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CreatedCustomerResult> => {
    try {
      const res = await apiClient.post<CreatedCustomerResult>(
        "/api/admin/customers",
        data,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string().min(1),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      marketingOptIn: z.boolean().optional(),
      // null clears the group assignment
      groupId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Customer> => {
    try {
      const { customerId, ...body } = data;
      const res = await apiClient.patch<Customer>(
        `/api/admin/customers/${customerId}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const generateSetPasswordLinkServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }): Promise<SetPasswordLinkResult> => {
    try {
      const res = await apiClient.post<SetPasswordLinkResult>(
        `/api/admin/customers/${data.customerId}/set-password-link`,
        undefined,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// Public (unauthenticated) — the token is the credential, so no headers needed.
export const setPasswordServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(1),
      password: z.string().min(8).max(128),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean; email: string }> => {
    try {
      const res = await apiClient.post<{ success: boolean; email: string }>(
        "/api/customer/set-password",
        data,
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Addresses ────────────────────────────────────────────────────────────────

export const getCustomerAddressesServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }): Promise<CustomerAddress[]> => {
    try {
      const res = await apiClient.get<CustomerAddress[]>(
        `/api/admin/customers/${data.customerId}/addresses`,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createCustomerAddressServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string().min(1),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      company: z.string().max(255).optional(),
      line1: z.string().min(1).max(255),
      line2: z.string().max(255).optional(),
      city: z.string().min(1).max(100),
      state: z.string().max(100).optional(),
      postalCode: z.string().min(1).max(20),
      countryCode: z.string().length(2),
      phone: z.string().max(50).optional(),
      isDefault: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CustomerAddress> => {
    const { customerId, ...body } = data;
    try {
      const res = await apiClient.post<CustomerAddress>(
        `/api/admin/customers/${customerId}/addresses`,
        body,
        { headers: await storeHeaders() },
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
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
