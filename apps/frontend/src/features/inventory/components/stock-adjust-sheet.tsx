import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import type { InventoryItemView } from "~/types/api";
import { adjustInventoryServerFn } from "../server";
import { available } from "../utils";

const ADJUSTMENT_REASONS = [
  { value: "restock", label: "Restock" },
  { value: "damage", label: "Damage / Loss" },
  { value: "correction", label: "Correction" },
  { value: "return", label: "Customer Return" },
  { value: "other", label: "Other" },
];

export function StockAdjustSheet({
  item,
  onClose,
}: {
  item: InventoryItemView | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [qty, setQty] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [reference, setReference] = React.useState("");

  // Reset the form whenever a new item is opened for adjustment.
  React.useEffect(() => {
    if (item) {
      setQty(0);
      setReason("");
      setReference("");
    }
  }, [item]);

  const adjustMutation = useMutation({
    mutationFn: (vars: {
      variantId: string;
      adjustment: number;
      reason: string;
      reference?: string;
    }) => adjustInventoryServerFn({ data: vars }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
  });

  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Adjust Stock</SheetTitle>
          {item && (
            <SheetDescription>
              {item.productName}
              {item.variantName ? ` · ${item.variantName}` : ""}
              {" · "}
              <span className="font-mono">{item.sku}</span>
            </SheetDescription>
          )}
        </SheetHeader>

        {item && (
          <div className="flex flex-col gap-5 px-4 pb-4">
            {/* Current stock summary */}
            <div className="grid grid-cols-3 divide-x rounded-lg border text-center">
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">On hand</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {item.quantity}
                </p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">Reserved</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {item.reserved}
                </p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {available(item)}
                </p>
              </div>
            </div>

            {/* Quantity adjustment */}
            <div className="space-y-2">
              <Label>Adjustment</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setQty((q) => q - 1)}
                >
                  <MinusIcon className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  className="text-center tabular-nums"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setQty((q) => q + 1)}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {qty !== 0 && (
                <p className="text-xs text-muted-foreground">
                  New available:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {available(item) + qty}
                  </span>
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="adjust-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="adjust-reference">
                Reference{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="adjust-reference"
                placeholder="e.g. PO-1234"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {adjustMutation.isError && (
              <p className="text-sm text-destructive">
                {adjustMutation.error.message}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={qty === 0 || !reason || adjustMutation.isPending}
                onClick={() =>
                  adjustMutation.mutate({
                    variantId: item.variantId,
                    adjustment: qty,
                    reason,
                    reference: reference || undefined,
                  })
                }
              >
                {adjustMutation.isPending ? "Saving…" : "Save adjustment"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
