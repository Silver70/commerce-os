import { Link } from "@tanstack/react-router";
import type { Category } from "~/types/api";
import { cn } from "~/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  /** Slug of the currently-selected category, if any. */
  activeSlug?: string;
}

const linkClass = (active: boolean) =>
  cn(
    "block rounded-lg px-3 py-1.5 text-sm transition-colors",
    active
      ? "bg-muted font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

/** Sidebar category navigation. Selecting a category sets `?category=<slug>`. */
export function CategoryFilter({
  categories,
  activeSlug,
}: CategoryFilterProps) {
  return (
    <nav className="space-y-0.5">
      <Link to="/products" search={{}} className={linkClass(!activeSlug)}>
        All products
      </Link>
      {categories.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          activeSlug={activeSlug}
          depth={0}
        />
      ))}
    </nav>
  );
}

function CategoryNode({
  category,
  activeSlug,
  depth,
}: {
  category: Category;
  activeSlug?: string;
  depth: number;
}) {
  return (
    <>
      <Link
        to="/products"
        search={{ category: category.slug }}
        className={linkClass(activeSlug === category.slug)}
        style={
          depth > 0 ? { paddingLeft: `${0.75 + depth * 0.75}rem` } : undefined
        }
      >
        {category.name}
      </Link>
      {category.children?.map((child) => (
        <CategoryNode
          key={child.id}
          category={child}
          activeSlug={activeSlug}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
