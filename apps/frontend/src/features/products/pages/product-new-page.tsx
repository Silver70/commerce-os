import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { toCents } from "~/lib/money";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Category } from "~/types/api";
import {
  categoriesQueryOptions,
  productQueryOptions,
  productsQueryOptions,
} from "../queries";
import {
  createCategoryServerFn,
  createProductServerFn,
  uploadMediaServerFn,
} from "../server";
import {
  generateVariantDrafts,
  STATUS_HINTS,
  toIntOrUndefined,
} from "../utils";
import type { OptionGroup, PendingFile, VariantDraft } from "../types";
import { CategoriesCard } from "../components/categories-card";
import { DescriptionEditor } from "../components/description-editor";
import { ProductMediaUploader } from "../components/product-media-uploader";
import { ProductStatusBadge } from "../components/product-status-badge";
import {
  VariantBuilderCard,
  VariantOptionsCard,
} from "../components/variant-builder";

// Zod schema (mirrors CreateProductDto)
const createProductSchema = z.object({
  name: z.string().min(1, "Product title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  vendor: z.string().optional(),
  tags: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string()),
  options: z.array(
    z.object({
      name: z.string().min(1),
      values: z.array(z.string()),
    }),
  ),
  variants: z.array(
    z.object({
      // Auto-generated from title + option values; blank is fine, the backend
      // fills in a unique fallback.
      sku: z.string().optional(),
      name: z.string().optional(),
      price: z.number().int().min(0),
      compareAtPrice: z.number().int().min(0).optional(),
      costPrice: z.number().int().min(0).optional(),
      weight: z.number().int().min(0).optional(),
      isActive: z.boolean(),
      optionValueIds: z.array(z.string()),
      optionValues: z
        .array(z.object({ option: z.string(), value: z.string() }))
        .optional(),
      initialStock: z.number().int().min(0).optional(),
    }),
  ),
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

export function ProductNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDesc] = React.useState("");
  const [shortDesc, setShortDesc] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "active" | "archived">(
    "draft",
  );
  const [vendor, setVendor] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [selectedCats, setCats] = React.useState<Category[]>([]);
  const [slug, setSlug] = React.useState("");
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDesc, setMetaDesc] = React.useState("");
  const [variantOptions, setVariantOptions] = React.useState<OptionGroup[]>([
    { id: "opt-1", name: "", values: [] },
  ]);
  const [variants, setVariants] = React.useState<VariantDraft[]>([]);
  const [variantsGenerated, setVariantsGenerated] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  // Categories from API
  const { data: categories = [] } = useQuery({
    ...categoriesQueryOptions(),
    // Don't suspend — show empty gracefully until loaded
  });

  const dirty = () => setIsDirty(true);

  function wrap<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      dirty();
    };
  }

  function addCat(cat: Category) {
    setCats((prev) => [...prev, cat]);
    dirty();
  }

  function removeCat(id: string) {
    setCats((prev) => prev.filter((c) => c.id !== id));
    dirty();
  }

  function addTag() {
    const raw = tagInput.trim();
    if (!raw || tags.includes(raw)) return;
    setTags((prev) => [...prev, raw]);
    setTagInput("");
    dirty();
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
    dirty();
  }

  function updateVariant(id: string, patch: Partial<VariantDraft>) {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );
    dirty();
  }

  function deleteVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    dirty();
  }

  function addPendingFile(file: File) {
    setPendingFiles((prev) => [
      ...prev,
      {
        id: `pf-${Date.now()}-${Math.random()}`,
        file,
        altText: "",
        primary: prev.length === 0,
      },
    ]);
    dirty();
  }

  function removePendingFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
    dirty();
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CreateProductFormData) => {
      const product = await createProductServerFn({ data: payload });

      // Upload queued media after product is created
      for (let i = 0; i < pendingFiles.length; i++) {
        const pf = pendingFiles[i];
        const arrayBuffer = await pf.file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        await uploadMediaServerFn({
          data: {
            productId: product.id,
            fileBase64: base64,
            mimeType: pf.file.type,
            fileName: pf.file.name,
            altText: pf.altText || undefined,
            position: i,
          },
        });
      }

      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({
        queryKey: productsQueryOptions().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: productQueryOptions(product.id).queryKey,
      });
      navigate({
        to: "/admin/products/$productId",
        params: { productId: product.id },
      });
    },
    onError: (err) => {
      setErrors({
        _root: err instanceof Error ? err.message : "Failed to create product",
      });
    },
  });

  // Quick-create a category inline, then auto-select it. Full management
  // (parent, description, reordering) lives at /admin/categories.
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createCategoryServerFn({ data: { name } }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({
        queryKey: categoriesQueryOptions().queryKey,
      });
      addCat(cat);
    },
  });

  function handleSave(targetStatus: "draft" | "active") {
    setStatus(targetStatus);
    // Use a microtask so state update settles before reading
    Promise.resolve().then(() => {
      const raw: CreateProductFormData = {
        name: title.trim(),
        description: description.trim() || undefined,
        status: targetStatus,
        vendor: vendor.trim() || undefined,
        tags,
        seoTitle: metaTitle.trim() || undefined,
        seoDescription: metaDesc.trim() || undefined,
        categoryIds: selectedCats.map((c) => c.id),
        options: variantsGenerated
          ? variantOptions
              .filter((o) => o.name.trim() && o.values.length > 0)
              .map((o) => ({ name: o.name, values: o.values }))
          : [],
        variants: variantsGenerated
          ? variants.map((v) => ({
              sku: v.sku.trim() || undefined,
              name: v.name || undefined,
              price: toCents(v.price),
              compareAtPrice: v.compareAt ? toCents(v.compareAt) : undefined,
              costPrice: v.cost ? toCents(v.cost) : undefined,
              weight: toIntOrUndefined(v.weight),
              isActive: v.active,
              optionValueIds: v.optionValueIds,
              optionValues: v.optionValues,
              initialStock: toIntOrUndefined(v.initialStock),
            }))
          : [],
      };

      const result = createProductSchema.safeParse(raw);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path.join(".");
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }
      setErrors({});
      createMutation.mutate(result.data);
    });
  }

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6 pb-28">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              to="/admin/products"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Products
            </Link>
            <ChevronRightIcon className="h-3.5 w-3.5" />
            <span className="text-foreground">Add product</span>
          </div>

          <h1 className="text-2xl font-semibold leading-tight">
            {title.trim() || "Untitled product"}
          </h1>

          <div className="mt-1.5 flex items-center gap-2.5">
            <ProductStatusBadge status={status} />
            {variantsGenerated && (
              <span className="text-xs text-muted-foreground">
                {variants.length} variants
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="lg" className="h-9 px-4" asChild>
            <Link to="/admin/products">Discard</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-9 px-4"
            onClick={() => handleSave("draft")}
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
            ) : (
              "Save draft"
            )}
          </Button>
          <Button
            size="lg"
            className="h-9 px-5"
            onClick={() => handleSave("active")}
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </div>

      {/* Root error */}
      {errors._root && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors._root}
        </div>
      )}

      {/* ── Two-column grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column (2 / 3) ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic information */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">
                Basic information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Product title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => wrap(setTitle)(e.target.value)}
                  className={cn(
                    "h-10 text-sm",
                    errors.name && "border-destructive",
                  )}
                  placeholder="e.g. Wave Board Pro"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Description</Label>
                <DescriptionEditor
                  value={description}
                  onChange={wrap(setDesc)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Short description
                  </Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      shortDesc.length > 480
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {shortDesc.length} / 500
                  </span>
                </div>
                <textarea
                  value={shortDesc}
                  onChange={(e) => wrap(setShortDesc)(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
                  placeholder="Brief summary shown in search results and product cards…"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Vendor</Label>
                <Input
                  value={vendor}
                  onChange={(e) => wrap(setVendor)(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tags</Label>
                <div
                  className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 min-h-[38px] cursor-text"
                  onClick={(e) =>
                    (
                      e.currentTarget.querySelector(
                        "input",
                      ) as HTMLInputElement | null
                    )?.focus()
                  }
                >
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="group inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="-mr-0.5 ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      } else if (
                        e.key === "Backspace" &&
                        !tagInput &&
                        tags.length > 0
                      ) {
                        removeTag(tags[tags.length - 1]);
                      }
                    }}
                    onBlur={addTag}
                    placeholder={
                      tags.length === 0 ? "Type a tag, press Enter…" : "Add…"
                    }
                    className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Media</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <ProductMediaUploader
                files={pendingFiles}
                onAdd={addPendingFile}
                onRemove={removePendingFile}
              />
            </CardContent>
          </Card>

          {/* Variants */}
          {variantsGenerated ? (
            <VariantBuilderCard
              variants={variants}
              options={variantOptions}
              onUpdate={updateVariant}
              onDelete={deleteVariant}
              onEditOptions={() => setVariantsGenerated(false)}
            />
          ) : (
            <VariantOptionsCard
              options={variantOptions}
              onChange={setVariantOptions}
              onGenerate={() => {
                const generated = generateVariantDrafts(variantOptions, title);
                setVariants(generated);
                setVariantsGenerated(true);
                dirty();
              }}
            />
          )}
        </div>

        {/* ── Right column (1 / 3) ────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Status */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Visibility
                </Label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as "draft" | "active" | "archived");
                    dirty();
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {STATUS_HINTS[status]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <CategoriesCard
            allCategories={categories}
            selected={selectedCats}
            onAdd={addCat}
            onRemove={removeCat}
            onCreate={(name) => createCategoryMutation.mutate(name)}
            isCreating={createCategoryMutation.isPending}
          />

          {/* SEO */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL slug
                </Label>
                <div className="flex h-9 overflow-hidden rounded-lg border border-border">
                  <span className="flex shrink-0 items-center border-r border-border bg-muted px-3 text-xs text-muted-foreground">
                    /products/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => wrap(setSlug)(e.target.value)}
                    placeholder="auto-generated"
                    className="min-w-0 flex-1 bg-background px-3 text-sm outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate from title.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Meta title
                  </Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      metaTitle.length > 55
                        ? "text-amber-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {metaTitle.length} / 60
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => wrap(setMetaTitle)(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Page title for search engines"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Meta description
                  </Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      metaDesc.length > 145
                        ? "text-amber-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {metaDesc.length} / 160
                  </span>
                </div>
                <textarea
                  value={metaDesc}
                  onChange={(e) => wrap(setMetaDesc)(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
                  placeholder="Description for search results…"
                />
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Preview
                </p>
                <p className="text-sm font-medium text-blue-600 truncate leading-snug">
                  {metaTitle || title || "Untitled"}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-500">
                  yourstore.com/products/{slug || "product-slug"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                  {metaDesc || shortDesc || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sticky save bar ───────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky bottom-0 -mx-6 -mb-6 z-20 border-t border-border bg-background/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-muted-foreground">
              Unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => navigate({ to: "/admin/products" })}
                disabled={isPending}
              >
                Discard
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => handleSave("draft")}
                disabled={isPending}
              >
                Save draft
              </Button>
              <Button
                size="sm"
                className="h-8 px-4"
                onClick={() => handleSave("active")}
                disabled={isPending}
              >
                {isPending ? (
                  <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
