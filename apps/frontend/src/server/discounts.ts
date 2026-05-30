import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Coupon, Discount } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getDiscountsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Discount[]> => {
    try {
      const res = await apiClient.get<Discount[]>("/api/admin/discounts", {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

export const getDiscountByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ discountId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Discount> => {
    try {
      const res = await apiClient.get<Discount>(
        `/api/admin/discounts/${data.discountId}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createDiscountServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      type: z.enum(["percentage", "fixed_amount"]),
      value: z.number().int().nonnegative(),
      scope: z.enum(["product", "category", "order"]),
      scopeId: z.string().optional(),
      minOrderAmount: z.number().int().nonnegative().optional(),
      isActive: z.boolean(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Discount> => {
    try {
      const res = await apiClient.post<Discount>("/api/admin/discounts", data, {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateDiscountServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      discountId: z.string().min(1),
      name: z.string().min(1).optional(),
      type: z.enum(["percentage", "fixed_amount"]).optional(),
      value: z.number().int().nonnegative().optional(),
      scope: z.enum(["product", "category", "order"]).optional(),
      scopeId: z.string().optional(),
      minOrderAmount: z.number().int().nonnegative().optional(),
      isActive: z.boolean().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Discount> => {
    try {
      const { discountId, ...body } = data;
      const res = await apiClient.patch<Discount>(
        `/api/admin/discounts/${discountId}`,
        body,
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

export const getCouponsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Coupon[]> => {
    try {
      const res = await apiClient.get<Coupon[]>("/api/admin/coupons", {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

export const createCouponServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(1).max(100),
      type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
      value: z.number().int().nonnegative().optional(),
      minOrderAmount: z.number().int().nonnegative().optional(),
      maxUsageCount: z.number().int().positive().optional(),
      maxUsagePerCustomer: z.number().int().positive().optional(),
      isActive: z.boolean(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Coupon> => {
    try {
      const res = await apiClient.post<Coupon>("/api/admin/coupons", data, {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteCouponServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ couponId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(`/api/admin/coupons/${data.couponId}`, {
        headers: storeHeaders(),
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
