import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { CustomerGroup } from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
}

export const getCustomerGroupsServerFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<CustomerGroup[]> => {
  try {
    const res = await apiClient.get<CustomerGroup[]>(
      "/api/admin/customer-groups",
      { headers: await storeHeaders() },
    );
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
});

export const createCustomerGroupServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CustomerGroup> => {
    try {
      const res = await apiClient.post<CustomerGroup>(
        "/api/admin/customer-groups",
        data,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateCustomerGroupServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      groupId: z.string().min(1),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CustomerGroup> => {
    try {
      const { groupId, ...body } = data;
      const res = await apiClient.patch<CustomerGroup>(
        `/api/admin/customer-groups/${groupId}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteCustomerGroupServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ groupId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      await apiClient.delete(`/api/admin/customer-groups/${data.groupId}`, {
        headers: await storeHeaders(),
      });
      return { success: true };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
