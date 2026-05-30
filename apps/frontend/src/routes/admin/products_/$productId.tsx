import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  PencilIcon,
  ImageIcon,
  PlusIcon,
  AlertTriangleIcon,
  XIcon,
  CheckIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { z } from "zod";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ProductStatusBadge,
  ProductThumbnail,
  formatPrice,
} from "~/routes/admin/products_/index";
import {
  updateProductServerFn,
  deleteProductServerFn,
  createVariantServerFn,
  updateVariantServerFn,
  deleteVariantServerFn,
  uploadMediaServerFn,
  deleteMediaServerFn,
} from "~/server/products";
import {
  productQueryOptions,
  productsQueryOptions,
} from "~/queries/products";
import type {
  Product,
  ProductVariant,
  ProductMedia,
  ProductOption,
} from "~/types/api";

export const Route = createFileRoute("/admin/products_/$productId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueryOptions(params.productId)),
  component: ProductDetailPage,
});

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const updateProductSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

const createVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().optional(),
  price: z.coerce.number().int().min(0, "Price is required"),
  compareAtPrice: z.coerce.number().int().min(0).optional(),
  costPrice: z.coerce.number().int().min(0).optional(),
  weight: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  initialStock: z.coerce.number().int().min(0).optional(),
});

const updateVariantSchema = z.object({
  sku: z.string().optional(),
  price: z.coerce.number().int().min(0).optional(),
  compareAtPrice: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

type UpdateProductInput = z.infer<typeof updateProductSchema>;
type CreateVariantInput = z.infer<typeof createVariantSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCents(dollars: string): number {
  const n = parseFloat(dollars);
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100);
}

function variantLabel(v: ProductVariant): string {
  if (v.optionValues.length > 0) {
    return v.optionValues.map((ov) => ov.value).join(" / ");
  }
  return v.name ?? v.sku;
}

type StockState = { dot: string; valueClass: string; label: string };

function stockState(_v: ProductVariant): StockState {
  // Stock data lives in the inventory module, not products API.
  // Show neutral state until inventory is wired in Phase 4.
  return { dot: "bg-muted-foreground/40", valueClass: "text-muted-foreground", label: "—" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MediaGallery({
  images,
  productId,
  isEditing,
  onUpload,
  onDelete,
}: {
  images: ProductMedia[];
  productId: string;
  isEditing: boolean;
  onUpload: (file: File, altText?: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => onUpload(f));
    e.target.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Media</CardTitle>
          {isEditing && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon className="h-3.5 w-3.5" />
                Upload
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
            <ImageIcon className="mr-2 h-5 w-5" />
            <span className="text-sm">No media yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted"
              >
                <img
                  src={img.url}
                  alt={img.altText ?? ""}
                  className="h-full w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onDelete(img.id)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
                {img.altText && (
                  <p className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-1.5 py-1 text-[10px] text-white/90">
                    {img.altText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptionsCard({ options }: { options: ProductOption[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((group) => (
          <div key={group.id} className="flex items-start gap-3">
            <span className="w-16 shrink-0 pt-0.5 text-sm text-muted-foreground">
              {group.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((v) => (
                <Badge
                  key={v.id}
                  variant="outline"
                  className="px-2 py-0.5 text-xs font-normal"
                >
                  {v.value}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Inline variant edit form
function VariantEditRow({
  variant,
  productId,
  onSaved,
  onCancel,
}: {
  variant: ProductVariant;
  productId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [sku, setSku]       = React.useState(variant.sku);
  const [price, setPrice]   = React.useState(String(variant.price / 100));
  const [compareAt, setCmp] = React.useState(
    variant.compareAtPrice ? String(variant.compareAtPrice / 100) : "",
  );
  const [isActive, setActive] = React.useState(variant.isActive);
  const [error, setError] = React.useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => {
      const parsed = updateVariantSchema.safeParse({
        sku: sku.trim() || undefined,
        price: price ? toCents(price) : undefined,
        compareAtPrice: compareAt ? toCents(compareAt) : undefined,
        isActive,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Validation error");
      }
      return updateVariantServerFn({
        data: {
          productId,
          variantId: variant.id,
          body: parsed.data,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey });
      onSaved();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to update variant"),
  });

  return (
    <tr className="bg-muted/20">
      <td colSpan={6} className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-8 font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price ($)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compare-at ($)</Label>
            <Input value={compareAt} onChange={(e) => setCmp(e.target.value)} placeholder="—" className="h-8 text-xs" />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setActive(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-500"
              />
              Active
            </label>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-orange-700 text-white hover:bg-orange-800"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

// New variant form row
function AddVariantRow({
  productId,
  onSaved,
  onCancel,
}: {
  productId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [sku, setSku]         = React.useState("");
  const [name, setName]       = React.useState("");
  const [price, setPrice]     = React.useState("");
  const [compareAt, setCmp]   = React.useState("");
  const [stock, setStock]     = React.useState("");
  const [error, setError]     = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const parsed = createVariantSchema.safeParse({
        sku: sku.trim(),
        name: name.trim() || undefined,
        price: toCents(price),
        compareAtPrice: compareAt ? toCents(compareAt) : undefined,
        initialStock: stock ? parseInt(stock, 10) : undefined,
        isActive: true,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Validation error");
      }
      return createVariantServerFn({ data: { productId, body: parsed.data } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey });
      onSaved();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to create variant"),
  });

  return (
    <tr className="bg-muted/10 border-t border-border">
      <td colSpan={6} className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">SKU <span className="text-destructive">*</span></Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-8 font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price ($) <span className="text-destructive">*</span></Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compare-at ($)</Label>
            <Input value={compareAt} onChange={(e) => setCmp(e.target.value)} placeholder="—" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Initial stock</Label>
            <Input value={stock} onChange={(e) => setStock(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-orange-700 text-white hover:bg-orange-800"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : "Add variant"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

function VariantsCard({
  variants,
  productId,
  isEditing,
}: {
  variants: ProductVariant[];
  productId: string;
  isEditing: boolean;
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) =>
      deleteVariantServerFn({ data: { productId, variantId } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey }),
  });

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Variants</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {variants.length}
            </Badge>
          </div>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => { setShowAdd(true); setEditingId(null); }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add variant
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Variant</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                {isEditing && <th className="px-4 py-2 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variants.map((v) => {
                const s = stockState(v);
                if (isEditing && editingId === v.id) {
                  return (
                    <VariantEditRow
                      key={v.id}
                      variant={v}
                      productId={productId}
                      onSaved={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }
                return (
                  <tr key={v.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{variantLabel(v)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums">{formatPrice(v.price)}</span>
                      {v.compareAtPrice != null && v.compareAtPrice > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground line-through tabular-nums">
                          {formatPrice(v.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                        <span className={cn("tabular-nums", s.valueClass)}>{s.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 py-0 text-[11px]",
                          v.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {isEditing && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingId(v.id); setShowAdd(false); }}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(v.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {isEditing && showAdd && (
                <AddVariantRow
                  productId={productId}
                  onSaved={() => setShowAdd(false)}
                  onCancel={() => setShowAdd(false)}
                />
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Edit form for product fields ─────────────────────────────────────────────

function ProductEditForm({
  product,
  onSaved,
  onCancel,
}: {
  product: Product;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName]           = React.useState(product.name);
  const [description, setDesc]    = React.useState(product.description ?? "");
  const [status, setStatus]       = React.useState<"draft" | "active" | "archived">(product.status);
  const [vendor, setVendor]       = React.useState(product.vendor ?? "");
  const [tags, setTags]           = React.useState((product.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle]   = React.useState("");
  const [seoDesc, setSeoDesc]     = React.useState("");
  const [error, setError]         = React.useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => {
      const body: UpdateProductInput = {};
      if (name.trim() !== product.name) body.name = name.trim();
      if (description.trim() !== (product.description ?? "")) body.description = description.trim() || undefined;
      if (status !== product.status) body.status = status;
      if (vendor.trim() !== (product.vendor ?? "")) body.vendor = vendor.trim() || undefined;
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (JSON.stringify(parsedTags) !== JSON.stringify(product.tags ?? [])) body.tags = parsedTags;
      if (seoTitle.trim()) body.seoTitle = seoTitle.trim();
      if (seoDesc.trim()) body.seoDescription = seoDesc.trim();

      const result = updateProductSchema.safeParse(body);
      if (!result.success) {
        throw new Error(result.error.issues[0]?.message ?? "Validation error");
      }
      return updateProductServerFn({ data: { productId: product.id, body: result.data } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryOptions(product.id).queryKey });
      queryClient.invalidateQueries({ queryKey: productsQueryOptions().queryKey });
      onSaved();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to update product"),
  });

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold">Edit product</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Product title <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            placeholder="Describe your product…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Vendor</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Tags</Label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="h-9 text-sm"
            placeholder="comma, separated, tags"
          />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">SEO Title (optional)</Label>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">SEO Description (optional)</Label>
          <textarea
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button
            className="h-9 bg-orange-700 text-white hover:bg-orange-800"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckIcon className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={updateMutation.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteProductButton({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProductServerFn({ data: { productId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryOptions().queryKey });
      navigate({ to: "/admin/products" });
    },
  });

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete product
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: product } = useSuspenseQuery(productQueryOptions(productId));

  const [isEditing, setIsEditing] = React.useState(false);

  // Media mutations
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      return uploadMediaServerFn({
        data: {
          productId,
          fileBase64: base64,
          mimeType: file.type,
          fileName: file.name,
          position: product.media.length,
        },
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey }),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) =>
      deleteMediaServerFn({ data: { productId, mediaId } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey }),
  });

  // Stock data lives in the inventory module — placeholders until inventory is wired
  const lowStockCount: number = 0;
  const outOfStockCount: number = 0;
  const activeCount = product.variants.filter((v) => v.isActive).length;
  const onSaleCount = product.variants.filter(
    (v) => v.compareAtPrice != null && v.compareAtPrice > 0,
  ).length;

  const priceMin = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;
  const priceMax = product.variants.length > 0
    ? Math.max(...product.variants.map((v) => v.price))
    : 0;
  const priceLabel =
    product.variants.length === 0
      ? "—"
      : priceMin === priceMax
        ? formatPrice(priceMin)
        : `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <nav className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            to="/admin/products"
            className="transition-colors hover:text-foreground"
          >
            Products
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ProductThumbnail name={product.name} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold">{product.name}</h1>
                <ProductStatusBadge status={product.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
                {" · "}
                {priceLabel}
                {product.vendor ? ` · ${product.vendor}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsEditing(false)}
              >
                <XIcon className="h-4 w-4" />
                Cancel editing
              </Button>
            ) : (
              <Button
                className="gap-2 bg-orange-700 text-white shadow-none hover:bg-orange-800"
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="h-4 w-4" />
                Edit product
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-3 flex items-center justify-end">
            <DeleteProductButton productId={productId} />
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit form or description */}
          {isEditing ? (
            <ProductEditForm
              product={product}
              onSaved={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent>
                {product.description ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/60">
                    No description added.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Media */}
          <MediaGallery
            images={product.media}
            productId={productId}
            isEditing={isEditing}
            onUpload={(file) => uploadMediaMutation.mutate(file)}
            onDelete={(mediaId) => deleteMediaMutation.mutate(mediaId)}
          />

          {/* Options */}
          {product.options.length > 0 && (
            <OptionsCard options={product.options} />
          )}

          {/* Variants */}
          <VariantsCard
            variants={product.variants}
            productId={productId}
            isEditing={isEditing}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Product info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Product info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <ProductStatusBadge status={product.status} />
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Slug</span>
                <span className="break-all text-right font-mono text-xs">{product.slug}</span>
              </div>
              {product.vendor && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vendor</span>
                    <span>{product.vendor}</span>
                  </div>
                </>
              )}
              {(product.tags ?? []).length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start justify-between gap-2">
                    <span className="shrink-0 text-muted-foreground">Tags</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {(product.tags ?? []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total in stock</span>
                <span className="font-semibold tabular-nums text-muted-foreground">
                  — (see Inventory)
                </span>
              </div>
              {lowStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Low stock</span>
                  <span className="flex items-center gap-1.5 font-medium tabular-nums text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                    {lowStockCount} variant{lowStockCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Out of stock</span>
                  <span className="font-medium tabular-nums text-destructive">
                    {outOfStockCount} variant{outOfStockCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total variants</span>
                <span className="tabular-nums">{product.variants.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="tabular-nums">{activeCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price range</span>
                <span className="font-semibold tabular-nums">{priceLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On sale</span>
                <span className="tabular-nums">
                  {onSaleCount > 0
                    ? `${onSaleCount} variant${onSaleCount !== 1 ? "s" : ""}`
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
