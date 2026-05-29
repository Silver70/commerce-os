import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Order, OrderStatus, PaginatedResponse } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

export const getOrdersServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z
        .enum(["pending", "paid", "processing", "shipped", "delivered", "refunded", "cancelled"])
        .optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<PaginatedResponse<Order>> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<PaginatedResponse<Order>>(
        `/api/admin/orders?${params.toString()}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateOrderStatusServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().min(1),
      status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "refunded", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.patch<Order>(
        `/api/admin/orders/${data.orderId}/status`,
        { status: data.status },
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const addOrderNoteServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().min(1),
      note: z.string().min(1, "Note cannot be empty"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await apiClient.post(
        `/api/admin/orders/${data.orderId}/notes`,
        { note: data.note },
        { headers: storeHeaders() },
      );
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const refundOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().min(1),
      amount: z.number().int().positive("Amount must be positive"),
      reason: z.string().min(1, "Reason is required"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await apiClient.post(
        `/api/admin/orders/${data.orderId}/refund`,
        { amount: data.amount, reason: data.reason },
        { headers: storeHeaders() },
      );
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createShipmentServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().min(1),
      carrier: z.string().min(1, "Carrier is required"),
      trackingNumber: z.string().min(1, "Tracking number is required"),
      trackingUrl: z.string().url("Invalid tracking URL").optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { orderId, ...body } = data;
      await apiClient.post(
        `/api/admin/orders/${orderId}/shipment`,
        body,
        { headers: storeHeaders() },
      );
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const getOrderByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Order> => {
    try {
      const res = await apiClient.get<Order>(`/api/admin/orders/${data.orderId}`, {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// Overload type needed by TypeScript for the enum literal
export type OrderStatusValue = OrderStatus;
