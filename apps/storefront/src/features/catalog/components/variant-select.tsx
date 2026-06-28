import type { ProductVariant } from "~/types/api";
import { cn } from "~/lib/utils";

interface VariantSelectProps {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
}

/**
 * Fallback variant selector for products that have multiple variants but no
 * structured options (the variants are distinguished only by name/SKU). Picks a
 * variant directly. Renders nothing when there's a single variant to choose.
 */
export function VariantSelect({
  variants,
  selectedId,
  onSelect,
}: VariantSelectProps) {
  const active = variants.filter((v) => v.isActive);
  if (active.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Variant</p>
      <div className="flex flex-wrap gap-2">
        {active.map((variant) => {
          const selected = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/50",
              )}
            >
              {variant.name ?? variant.sku}
            </button>
          );
        })}
      </div>
    </div>
  );
}
