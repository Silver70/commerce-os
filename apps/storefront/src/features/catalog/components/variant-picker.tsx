import type { Product } from "~/types/api";
import { cn } from "~/lib/utils";
import type { OptionSelection } from "../types";
import { isValueAvailable } from "../utils";

interface VariantPickerProps {
  product: Product;
  /** Controlled selection (option id → option-value id), owned by the page. */
  selection: OptionSelection;
  onSelect: (optionId: string, valueId: string) => void;
}

/**
 * Renders one row of value buttons per product option. Controlled: the page
 * owns the selection and derives the resolved variant from it. Combinations
 * that map to no active variant are disabled.
 */
export function VariantPicker({
  product,
  selection,
  onSelect,
}: VariantPickerProps) {
  if (product.options.length === 0) return null;

  return (
    <div className="space-y-4">
      {product.options.map((option) => (
        <div key={option.id} className="space-y-2">
          <p className="text-sm font-medium">{option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selection[option.id] === value.id;
              const available = isValueAvailable(
                product,
                selection,
                option.id,
                value.id,
              );
              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => onSelect(option.id, value.id)}
                  aria-pressed={selected}
                  disabled={!available}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/50",
                    !available &&
                      "cursor-not-allowed line-through opacity-40 hover:border-border",
                  )}
                >
                  {value.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
