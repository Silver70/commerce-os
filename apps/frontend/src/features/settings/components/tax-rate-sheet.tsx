import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "~/lib/utils";
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
import type { TaxRate } from "~/types/api";
import { createTaxRateServerFn, updateTaxRateServerFn } from "../server";
import { TAX_COUNTRIES, US_STATES } from "../constants";

export function TaxRateSheet({
  rate,
  open,
  onOpenChange,
}: {
  rate: TaxRate | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [rateVal, setRateVal] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [state, setState] = React.useState("");
  const [isInclusive, setIsIncl] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setName(rate?.name ?? "");
      setRateVal(rate ? String(rate.rate / 100) : "");
      setCountry(rate?.countryCode ?? "");
      setState(rate?.stateCode ?? "");
      setIsIncl(rate?.isInclusive ?? false);
      setIsActive(rate?.isActive ?? true);
    }
  }, [open, rate]);

  const isEdit = !!rate;
  const canSave =
    name.trim().length > 0 && rateVal.trim().length > 0 && country.length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      const basisPoints = Math.round(parseFloat(rateVal) * 100);
      if (isEdit) {
        return updateTaxRateServerFn({
          data: {
            id: rate.id,
            name: name.trim(),
            rate: basisPoints,
            isInclusive,
            isActive,
          },
        });
      }
      return createTaxRateServerFn({
        data: {
          name: name.trim(),
          rate: basisPoints,
          countryCode: country,
          stateCode: state || undefined,
          isInclusive,
          isActive,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["settings", "tax-rates"],
      });
      onOpenChange(false);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit tax rate" : "Add tax rate"}</SheetTitle>
          <SheetDescription>
            Tax rates are applied to orders in matching regions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="tx-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tx-name"
              placeholder="e.g. GST"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-rate">
              Rate <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tx-rate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0.00"
                value={rateVal}
                onChange={(e) => setRateVal(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="tx-country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Select
              value={country}
              onValueChange={(v) => {
                setCountry(v);
                setState("");
              }}
            >
              <SelectTrigger id="tx-country">
                <SelectValue placeholder="Select country…" />
              </SelectTrigger>
              <SelectContent>
                {TAX_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {country === "US" && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="tx-state">
                  <SelectValue placeholder="All states (or select one)" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2.5">
            <Label>Tax type</Label>
            <div className="flex flex-col gap-2">
              {([false, true] as const).map((incl) => (
                <label
                  key={String(incl)}
                  className="flex cursor-pointer items-center gap-2.5"
                  onClick={() => setIsIncl(incl)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isInclusive === incl
                        ? "border-amber-500 bg-amber-500"
                        : "border-border bg-transparent",
                    )}
                  >
                    {isInclusive === incl && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm">
                      {incl ? "Inclusive" : "Exclusive"}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {incl ? "(included in price)" : "(added on top of price)"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isActive ? "Applied to matching orders." : "Not currently applied."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                isActive
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  isActive
                    ? "left-0.5 translate-x-4 bg-white"
                    : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>

          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!canSave || mutation.isPending}
            className="flex-1"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add rate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
