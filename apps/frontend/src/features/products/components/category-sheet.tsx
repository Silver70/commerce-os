import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import type { Category } from "~/types/api";
import type { CategoryFormValues } from "../types";

// Radix Select disallows empty-string values, so use a sentinel for "no parent".
const NO_PARENT = "__none__";

type FlatOption = { id: string; name: string; depth: number };

/**
 * Flatten the category tree into select options, skipping `excludeId` and its
 * entire subtree — a category may not be parented to itself or a descendant.
 */
function flattenForParent(
  cats: Category[],
  excludeId: string | null,
  depth = 0,
): FlatOption[] {
  return cats.flatMap((c) => {
    if (c.id === excludeId) return [];
    return [
      { id: c.id, name: c.name, depth },
      ...flattenForParent(c.children, excludeId, depth + 1),
    ];
  });
}

export function CategorySheet({
  category,
  defaultParentId,
  allCategories,
  open,
  onOpenChange,
  onSave,
  isSaving,
  error,
}: {
  category: Category | null;
  defaultParentId: string | null;
  allCategories: Category[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (values: CategoryFormValues) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setParentId(category?.parentId ?? defaultParentId ?? null);
      setDescription(category?.description ?? "");
    }
  }, [open, category, defaultParentId]);

  const isEdit = !!category;
  const canSave = name.trim().length > 0 && !isSaving;

  const parentOptions = flattenForParent(allCategories, category?.id ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit category" : "Add category"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the category name, parent, and description."
              : "Create a category to organize your products. Nest it under a parent to build a hierarchy."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              placeholder="e.g. Footwear"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-parent">
              Parent category{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Select
              value={parentId ?? NO_PARENT}
              onValueChange={(v) => setParentId(v === NO_PARENT ? null : v)}
            >
              <SelectTrigger id="cat-parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Top level (no parent)</SelectItem>
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span style={{ paddingLeft: opt.depth * 14 }}>
                      {opt.depth > 0 && (
                        <span className="text-muted-foreground">↳ </span>
                      )}
                      {opt.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave at top level to create a root category.
            </p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="cat-description">
              Description{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <textarea
              id="cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
              placeholder="What kind of products belong in this category?"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!canSave}
            className="flex-1 text-white"
            onClick={() =>
              onSave({
                name: name.trim(),
                parentId,
                description: description.trim(),
              })
            }
          >
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add category"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
