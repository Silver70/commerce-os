import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

/** Compact −/＋ quantity control. Use a separate remove action to delete a line. */
export function QuantityStepper({
  quantity,
  onChange,
  disabled,
  min = 1,
  max = 99,
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center rounded-lg border">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || quantity <= min}
        onClick={() => onChange(quantity - 1)}
        className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
