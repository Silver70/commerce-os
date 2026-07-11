import * as React from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import type { ShippingMethod } from "~/types/api";
import type { MethodFormValues, RateType } from "../types";

export function methodDefaults(method: ShippingMethod | null): MethodFormValues {
  if (!method) {
    return {
      name: "",
      rateType: "flat_rate",
      price: "",
      minOrderAmount: "",
      estimatedDaysMin: "3",
      estimatedDaysMax: "7",
      isActive: true,
    };
  }
  return {
    name: method.name,
    rateType: method.rateType,
    price: (method.price / 100).toFixed(2),
    minOrderAmount:
      method.minOrderAmount != null
        ? (method.minOrderAmount / 100).toFixed(2)
        : "",
    estimatedDaysMin:
      method.estimatedDaysMin != null ? String(method.estimatedDaysMin) : "",
    estimatedDaysMax:
      method.estimatedDaysMax != null ? String(method.estimatedDaysMax) : "",
    isActive: method.isActive,
  };
}

export function MethodSheet({
  method,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  method: ShippingMethod | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (values: MethodFormValues) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = React.useState<MethodFormValues>(methodDefaults(null));

  React.useEffect(() => {
    if (open) setForm(methodDefaults(method));
  }, [open, method]);

  function set<K extends keyof MethodFormValues>(
    key: K,
    value: MethodFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isEdit = !!method;
  const canSave =
    form.name.trim().length > 0 && form.price.trim().length > 0 && !isSaving;

  const rateTypeOptions: { value: RateType; label: string }[] = [
    { value: "flat_rate", label: "Flat rate" },
    { value: "free", label: "Free shipping" },
    { value: "calculated", label: "Calculated" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {isEdit ? "Edit shipping method" : "Add shipping method"}
          </SheetTitle>
          <SheetDescription>
            Configure a shipping rate for this zone.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="m-name">
              Method name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="m-name"
              placeholder="e.g. Standard Shipping"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Rate type</Label>
            <div className="space-y-1.5">
              {rateTypeOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    form.rateType === opt.value
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "bg-muted/20 hover:bg-muted/40",
                  )}
                  onClick={() => set("rateType", opt.value)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      form.rateType === opt.value
                        ? "border-amber-500 bg-amber-500"
                        : "border-border",
                    )}
                  >
                    {form.rateType === opt.value && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-price">
              Price <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="m-price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-min-order">
              Minimum order amount{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="m-min-order"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 100.00"
                value={form.minOrderAmount}
                onChange={(e) => set("minOrderAmount", e.target.value)}
                className="w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to always charge this rate.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Estimated delivery</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                placeholder="min"
                value={form.estimatedDaysMin}
                onChange={(e) => set("estimatedDaysMin", e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                min={0}
                placeholder="max"
                value={form.estimatedDaysMax}
                onChange={(e) => set("estimatedDaysMax", e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {form.isActive
                  ? "This method is shown to customers at checkout."
                  : "This method is hidden from customers."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("isActive", !form.isActive)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                form.isActive
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  form.isActive
                    ? "left-0.5 translate-x-4 bg-white"
                    : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!canSave}
            className="flex-1"
            onClick={() => onSave(form)}
          >
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
