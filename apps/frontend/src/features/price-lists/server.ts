import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type {
  PriceList,
  PriceListAssignment,
  PriceListDetail,
  PriceListPrice,
} from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
}

// ─── Lists ──────────────────────────────────────────────────────────────────

export const getPriceListsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PriceList[]> => {
    try {
      const res = await apiClient.get<PriceList[]>("/api/admin/price-lists", {
        headers: await storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

export const getPriceListByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ priceListId: z.string().min(1) }))
  .handler(async ({ data }): Promise<PriceListDetail> => {
    try {
      const res = await apiClient.get<PriceListDetail>(
        `/api/admin/price-lists/${data.priceListId}`,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createPriceListServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      type: z.enum(["fixed", "adjustment"]),
      adjustmentBasisPoints: z.number().int().optional(),
      priority: z.number().int().nonnegative().optional(),
      isActive: z.boolean(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PriceList> => {
    try {
      const res = await apiClient.post<PriceList>(
        "/api/admin/price-lists",
        data,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updatePriceListServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceListId: z.string().min(1),
      name: z.string().min(1).optional(),
      type: z.enum(["fixed", "adjustment"]).optional(),
      adjustmentBasisPoints: z.number().int().optional(),
      priority: z.number().int().nonnegative().optional(),
      isActive: z.boolean().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PriceList> => {
    try {
      const { priceListId, ...body } = data;
      const res = await apiClient.patch<PriceList>(
        `/api/admin/price-lists/${priceListId}`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deletePriceListServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ priceListId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      await apiClient.delete(`/api/admin/price-lists/${data.priceListId}`, {
        headers: await storeHeaders(),
      });
      return { success: true };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Fixed prices ─────────────────────────────────────────────────────────────

export const setPriceListPricesServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceListId: z.string().min(1),
      prices: z.array(
        z.object({
          variantId: z.string().min(1),
          price: z.number().int().nonnegative(),
        }),
      ),
    }),
  )
  .handler(async ({ data }): Promise<PriceListPrice[]> => {
    try {
      const res = await apiClient.put<PriceListPrice[]>(
        `/api/admin/price-lists/${data.priceListId}/prices`,
        { prices: data.prices },
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deletePriceListPriceServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceListId: z.string().min(1),
      variantId: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      await apiClient.delete(
        `/api/admin/price-lists/${data.priceListId}/prices/${data.variantId}`,
        { headers: await storeHeaders() },
      );
      return { success: true };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Assignments ──────────────────────────────────────────────────────────────

export const createAssignmentServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceListId: z.string().min(1),
      customerId: z.string().optional(),
      groupId: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PriceListAssignment> => {
    try {
      const { priceListId, ...body } = data;
      const res = await apiClient.post<PriceListAssignment>(
        `/api/admin/price-lists/${priceListId}/assignments`,
        body,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteAssignmentServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceListId: z.string().min(1),
      assignmentId: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      await apiClient.delete(
        `/api/admin/price-lists/${data.priceListId}/assignments/${data.assignmentId}`,
        { headers: await storeHeaders() },
      );
      return { success: true };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Lookups (lists applicable to a customer / group) ─────────────────────────

export const getPriceListsForCustomerServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }): Promise<PriceList[]> => {
    try {
      const res = await apiClient.get<PriceList[]>(
        `/api/admin/price-lists/assigned-to/customer/${data.customerId}`,
        { headers: await storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
