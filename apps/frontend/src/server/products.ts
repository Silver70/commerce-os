import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type {
  Category,
  PaginatedResponse,
  Product,
  ProductMedia,
  ProductVariant,
  ProductStatus,
} from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

function storeHeaders() {
  return { cookie: incomingCookie(), ...adminStoreHeader() };
}

// ─── Zod schemas (mirror backend DTOs) ───────────────────────────────────────

const createProductVariantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().optional(),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  weight: z.number().int().min(0).optional(),
  requiresShipping: z.boolean().optional(),
  optionValueIds: z.array(z.string()).optional(),
  initialStock: z.number().int().min(0).optional(),
});

const createProductOptionSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string()),
});

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  options: z.array(createProductOptionSchema).optional(),
  variants: z.array(createProductVariantSchema).optional(),
});

const updateProductInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

const createVariantInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().optional(),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  weight: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  optionValueIds: z.array(z.string()).optional(),
  initialStock: z.number().int().min(0).optional(),
});

const updateVariantInputSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  price: z.number().int().min(0).optional(),
  compareAtPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  weight: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  optionValueIds: z.array(z.string()).optional(),
});

// ─── Products ─────────────────────────────────────────────────────────────────

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

export const getProductByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Product> => {
    try {
      const res = await apiClient.get<Product>(
        `/api/admin/products/${data.productId}`,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const createProductServerFn = createServerFn({ method: "POST" })
  .inputValidator(createProductInputSchema)
  .handler(async ({ data }): Promise<Product> => {
    // Transform option values from string[] to { value: string }[]
    const body = {
      ...data,
      options: data.options?.map((opt) => ({
        name: opt.name,
        values: opt.values.map((v) => ({ value: v })),
      })),
    };
    try {
      const res = await apiClient.post<Product>("/api/admin/products", body, {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateProductServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      body: updateProductInputSchema,
    }),
  )
  .handler(async ({ data }): Promise<Product> => {
    try {
      const res = await apiClient.patch<Product>(
        `/api/admin/products/${data.productId}`,
        data.body,
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

// ─── Variants ─────────────────────────────────────────────────────────────────

export const createVariantServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      body: createVariantInputSchema,
    }),
  )
  .handler(async ({ data }): Promise<ProductVariant> => {
    try {
      const res = await apiClient.post<ProductVariant>(
        `/api/admin/products/${data.productId}/variants`,
        data.body,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const updateVariantServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1),
      body: updateVariantInputSchema,
    }),
  )
  .handler(async ({ data }): Promise<ProductVariant> => {
    try {
      const res = await apiClient.patch<ProductVariant>(
        `/api/admin/products/${data.productId}/variants/${data.variantId}`,
        data.body,
        { headers: storeHeaders() },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteVariantServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(
        `/api/admin/products/${data.productId}/variants/${data.variantId}`,
        { headers: storeHeaders() },
      );
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Media ────────────────────────────────────────────────────────────────────

export const uploadMediaServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      fileBase64: z.string().min(1),
      mimeType: z.string().min(1),
      fileName: z.string().min(1),
      altText: z.string().optional(),
      position: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }): Promise<ProductMedia> => {
    const buffer = Buffer.from(data.fileBase64, "base64");
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([buffer], { type: data.mimeType }),
      data.fileName,
    );
    if (data.altText) formData.append("altText", data.altText);
    if (data.position !== undefined)
      formData.append("position", String(data.position));

    try {
      const res = await apiClient.post<ProductMedia>(
        `/api/admin/products/${data.productId}/media`,
        formData,
        {
          headers: {
            cookie: incomingCookie(),
            ...adminStoreHeader(),
          },
        },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const deleteMediaServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().min(1),
      mediaId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await apiClient.delete(
        `/api/admin/products/${data.productId}/media/${data.mediaId}`,
        { headers: storeHeaders() },
      );
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategoriesServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Category[]> => {
    try {
      const res = await apiClient.get<Category[]>("/api/admin/categories", {
        headers: storeHeaders(),
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

// ─── Re-export types for consumers ───────────────────────────────────────────

export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type CreateVariantInput = z.infer<typeof createVariantInputSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantInputSchema>;

// Re-export ProductStatus so other modules can import from here if needed
export type { ProductStatus };
