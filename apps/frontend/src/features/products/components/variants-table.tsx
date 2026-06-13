import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { formatPrice, toCents } from "~/lib/money";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ProductVariant } from "~/types/api";
import { productQueryOptions } from "../queries";
import {
  createVariantServerFn,
  deleteVariantServerFn,
  updateVariantServerFn,
} from "../server";
import { stockState, variantLabel } from "../utils";

// ─── Local validation schemas ───────────────────────────────────────────────

const createVariantSchema = z.object({
  // Optional — backend auto-generates a unique SKU when left blank.
  sku: z.string().optional(),
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

// ─── Inline edit row ────────────────────────────────────────────────────────

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
  const [sku, setSku] = React.useState(variant.sku);
  const [price, setPrice] = React.useState(String(variant.price / 100));
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
      queryClient.invalidateQueries({
        queryKey: productQueryOptions(productId).queryKey,
      });
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
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price ($)</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compare-at ($)</Label>
            <Input
              value={compareAt}
              onChange={(e) => setCmp(e.target.value)}
              placeholder="—"
              className="h-8 text-xs"
            />
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
            {updateMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── New variant row ────────────────────────────────────────────────────────

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
  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [compareAt, setCmp] = React.useState("");
  const [stock, setStock] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const parsed = createVariantSchema.safeParse({
        sku: sku.trim() || undefined,
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
      queryClient.invalidateQueries({
        queryKey: productQueryOptions(productId).queryKey,
      });
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
            <Label className="text-xs">SKU</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="h-8 font-mono text-xs"
              placeholder="Auto-generated"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Price ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compare-at ($)</Label>
            <Input
              value={compareAt}
              onChange={(e) => setCmp(e.target.value)}
              placeholder="—"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Initial stock</Label>
            <Input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="h-8 text-xs"
            />
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
            {createMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Add variant"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Variants table ─────────────────────────────────────────────────────────

export function ProductVariantsTable({
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
      queryClient.invalidateQueries({
        queryKey: productQueryOptions(productId).queryKey,
      }),
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
              onClick={() => {
                setShowAdd(true);
                setEditingId(null);
              }}
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
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Variant
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Stock
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Status
                </th>
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
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {v.sku}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums">
                        {formatPrice(v.price)}
                      </span>
                      {v.compareAtPrice != null && v.compareAtPrice > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground line-through tabular-nums">
                          {formatPrice(v.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            s.dot,
                          )}
                        />
                        <span className={cn("tabular-nums", s.valueClass)}>
                          {s.label}
                        </span>
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
                            onClick={() => {
                              setEditingId(v.id);
                              setShowAdd(false);
                            }}
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
