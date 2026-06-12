import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Order, OrderStatus, OrdersResponse } from "~/types/api";

async function storeHeaders() {
  return { ...(await authHeader()), ...adminStoreHeader() };
}

// ─── Manual order creation (mirrors backend CreateOrderDto) ──────────────────

const manualOrderAddressSchema = z.object({
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
});

const manualOrderLineItemSchema = z.object({
  variantId: z.string().optional(),
  productName: z.string().min(1).max(255),
  variantName: z.string().max(255).optional(),
  sku: z.string().max(255).optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
});

const createOrderInputSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(255),
  customerId: z.string().optional(),
  items: z.array(manualOrderLineItemSchema).min(1, "Add at least one product"),
  shippingAddress: manualOrderAddressSchema,
  billingAddress: manualOrderAddressSchema.optional(),
  paymentType: z.enum(["paid", "invoice"]),
  currency: z.string().length(3).optional(),
  shippingAmount: z.number().int().min(0).optional(),
  discountAmount: z.number().int().min(0).optional(),
  taxAmount: z.number().int().min(0).optional(),
  couponCode: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(createOrderInputSchema)
  .handler(async ({ data }): Promise<Order> => {
    try {
      const res = await apiClient.post<Order>("/api/admin/orders", data, {
        headers: await storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const getOrdersServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z
        .enum([
          "pending",
          "paid",
          "processing",
          "shipped",
          "delivered",
          "refunded",
          "cancelled",
        ])
        .optional(),
      customerId: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<OrdersResponse> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.customerId) params.set("customerId", data.customerId);
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", String(data.limit));
    try {
      const res = await apiClient.get<OrdersResponse>(
        `/api/admin/orders?${params.toString()}`,
        { headers: await storeHeaders() },
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
      status: z.enum([
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "refunded",
        "cancelled",
      ]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.patch<Order>(
        `/api/admin/orders/${data.orderId}/status`,
        { status: data.status },
        { headers: await storeHeaders() },
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
        { headers: await storeHeaders() },
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
        { headers: await storeHeaders() },
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
      await apiClient.post(`/api/admin/orders/${orderId}/shipment`, body, {
        headers: await storeHeaders(),
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const getOrderByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Order> => {
    try {
      const res = await apiClient.get<Order>(
        `/api/admin/orders/${data.orderId}`,
        {
          headers: await storeHeaders(),
        },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// Overload type needed by TypeScript for the enum literal
export type OrderStatusValue = OrderStatus;
