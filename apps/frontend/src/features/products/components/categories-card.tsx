import * as React from "react";
import { LoaderCircleIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { Category } from "~/types/api";

export function CategoriesCard({
  allCategories,
  selected,
  onAdd,
  onRemove,
  onCreate,
  isCreating = false,
}: {
  allCategories: Category[];
  selected: Category[];
  onAdd: (cat: Category) => void;
  onRemove: (id: string) => void;
  /** Quick-create a category by name. When omitted, no create affordance shows. */
  onCreate?: (name: string) => void;
  isCreating?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  // Flatten tree for suggestions
  function flattenCategories(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...flattenCategories(c.children)]);
  }
  const flat = flattenCategories(allCategories);

  const suggestions = flat.filter(
    (c) =>
      !selected.some((s) => s.id === c.id) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const trimmed = query.trim();
  const exactMatch = flat.some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = !!onCreate && trimmed.length > 0 && !exactMatch;

  function handleCreate() {
    if (!canCreate) return;
    onCreate?.(trimmed);
    setQuery("");
  }

  const showDropdown = focused && (suggestions.length > 0 || canCreate);

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder={
              onCreate ? "Search or create category…" : "Search categories…"
            }
            className="h-9 pl-8 text-sm"
          />

          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md">
              {suggestions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={() => {
                    onAdd(cat);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <PlusIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {cat.name}
                </button>
              ))}

              {canCreate && (
                <button
                  type="button"
                  disabled={isCreating}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreate();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60 disabled:opacity-60",
                    suggestions.length > 0 && "border-t border-border",
                  )}
                >
                  {isCreating ? (
                    <LoaderCircleIcon className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <PlusIcon className="h-3.5 w-3.5 shrink-0 text-orange-700" />
                  )}
                  <span className="text-muted-foreground">
                    Create{" "}
                    <span className="font-medium text-foreground">
                      “{trimmed}”
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cat) => (
              <span
                key={cat.id}
                className="group inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
              >
                {cat.name}
                <button
                  type="button"
                  onClick={() => onRemove(cat.id)}
                  className="ml-0.5 -mr-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No categories selected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
