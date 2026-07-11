import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { Product } from "~/types/api";
import { productQueryOptions, productsQueryOptions } from "../queries";
import { updateProductServerFn } from "../server";

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

type UpdateProductInput = z.infer<typeof updateProductSchema>;

export function ProductEditForm({
  product,
  onSaved,
  onCancel,
}: {
  product: Product;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(product.name);
  const [description, setDesc] = React.useState(product.description ?? "");
  const [status, setStatus] = React.useState<"draft" | "active" | "archived">(
    product.status,
  );
  const [vendor, setVendor] = React.useState(product.vendor ?? "");
  const [tags, setTags] = React.useState((product.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDesc, setSeoDesc] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => {
      const body: UpdateProductInput = {};
      if (name.trim() !== product.name) body.name = name.trim();
      if (description.trim() !== (product.description ?? ""))
        body.description = description.trim() || undefined;
      if (status !== product.status) body.status = status;
      if (vendor.trim() !== (product.vendor ?? ""))
        body.vendor = vendor.trim() || undefined;
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (JSON.stringify(parsedTags) !== JSON.stringify(product.tags ?? []))
        body.tags = parsedTags;
      if (seoTitle.trim()) body.seoTitle = seoTitle.trim();
      if (seoDesc.trim()) body.seoDescription = seoDesc.trim();

      const result = updateProductSchema.safeParse(body);
      if (!result.success) {
        throw new Error(result.error.issues[0]?.message ?? "Validation error");
      }
      return updateProductServerFn({
        data: { productId: product.id, body: result.data },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryOptions(product.id).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryOptions().queryKey,
      });
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
          <Label className="text-sm font-medium">
            Product title <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 text-sm"
          />
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
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Vendor</Label>
            <Input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="h-9 text-sm"
            />
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
          <Label className="text-sm font-medium text-muted-foreground">
            SEO Title (optional)
          </Label>
          <Input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            SEO Description (optional)
          </Label>
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
            className="h-9"
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
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
