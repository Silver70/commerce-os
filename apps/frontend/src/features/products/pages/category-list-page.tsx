import * as React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { FolderTreeIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Category } from "~/types/api";
import { categoriesQueryOptions } from "../queries";
import {
  createCategoryServerFn,
  deleteCategoryServerFn,
  updateCategoryServerFn,
} from "../server";
import type { CategoryFormValues } from "../types";
import { CategorySheet } from "../components/category-sheet";
import { CategoryTree } from "../components/category-tree";

type SheetState = {
  category: Category | null;
  defaultParentId: string | null;
  open: boolean;
};

const CLOSED: SheetState = {
  category: null,
  defaultParentId: null,
  open: false,
};

export function CategoryListPage() {
  const queryClient = useQueryClient();
  const categories = useSuspenseQuery(categoriesQueryOptions()).data;

  const [sheet, setSheet] = React.useState<SheetState>(CLOSED);
  const [error, setError] = React.useState<string | null>(null);

  function invalidate() {
    return queryClient.invalidateQueries(categoriesQueryOptions());
  }

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      createCategoryServerFn({
        data: {
          name: values.name,
          parentId: values.parentId ?? undefined,
          description: values.description || undefined,
        },
      }),
    onSuccess: () => {
      invalidate();
      setSheet(CLOSED);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      updateCategoryServerFn({
        data: {
          id,
          name: values.name,
          parentId: values.parentId,
          description: values.description,
        },
      }),
    onSuccess: () => {
      invalidate();
      setSheet(CLOSED);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategoryServerFn({ data: { id } }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => setError(err.message),
  });

  function handleSave(values: CategoryFormValues) {
    if (sheet.category) {
      updateMutation.mutate({ id: sheet.category.id, values });
    } else {
      createMutation.mutate(values);
    }
  }

  function openCreate(defaultParentId: string | null = null) {
    setError(null);
    setSheet({ category: null, defaultParentId, open: true });
  }

  function openEdit(category: Category) {
    setError(null);
    setSheet({ category, defaultParentId: null, open: true });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your products into a browsable hierarchy.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
          onClick={() => openCreate()}
        >
          <PlusIcon className="h-4 w-4" />
          Add category
        </Button>
      </div>

      {/* Delete errors surface here (sheet errors render inside the sheet) */}
      {error && !sheet.open && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Tree */}
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <FolderTreeIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No categories yet. Add one to get started.
          </p>
        </div>
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={openEdit}
          onAddChild={(parent) => openCreate(parent.id)}
          onDelete={(category) => deleteMutation.mutate(category.id)}
          deletingId={
            deleteMutation.isPending ? (deleteMutation.variables ?? null) : null
          }
        />
      )}

      <CategorySheet
        category={sheet.category}
        defaultParentId={sheet.defaultParentId}
        allCategories={categories}
        open={sheet.open}
        onOpenChange={(v) => setSheet((s) => ({ ...s, open: v }))}
        onSave={handleSave}
        isSaving={isSaving}
        error={sheet.open ? error : null}
      />
    </div>
  );
}
