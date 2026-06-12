import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { createCustomerAddressServerFn } from "~/features/customers/server";
import { customerAddressesQueryOptions } from "~/features/customers/queries";
import type { CustomerAddress } from "~/types/api";
import {
  EMPTY_SHIPPING_ADDRESS,
  customerAddressToShipping,
} from "../utils";
import type { ShippingAddress } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  addresses: CustomerAddress[];
  onSelect: (address: ShippingAddress) => void;
};

const REQUIRED: (keyof ShippingAddress)[] = [
  "firstName",
  "lastName",
  "line1",
  "city",
  "postalCode",
];

export function ShippingAddressSheet({
  open,
  onOpenChange,
  customerId,
  addresses,
  onSelect,
}: Props) {
  const queryClient = useQueryClient();
  const hasSaved = addresses.length > 0;

  const [adding, setAdding] = React.useState(!hasSaved);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ShippingAddress>(EMPTY_SHIPPING_ADDRESS);
  const [saveToCustomer, setSaveToCustomer] = React.useState(true);
  const [error, setError] = React.useState("");

  // Re-initialise whenever the sheet opens (or the customer changes).
  React.useEffect(() => {
    if (!open) return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
    setAdding(addresses.length === 0);
    setSelectedId(def?.id ?? null);
    setForm(EMPTY_SHIPPING_ADDRESS);
    setSaveToCustomer(true);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  const update = (patch: Partial<ShippingAddress>) =>
    setForm((p) => ({ ...p, ...patch }));

  const createMutation = useMutation({
    mutationFn: (addr: ShippingAddress) =>
      createCustomerAddressServerFn({
        data: {
          customerId,
          firstName: addr.firstName,
          lastName: addr.lastName,
          company: addr.company || undefined,
          line1: addr.line1,
          line2: addr.line2 || undefined,
          city: addr.city,
          state: addr.state || undefined,
          postalCode: addr.postalCode,
          countryCode: addr.countryCode,
          phone: addr.phone || undefined,
          // first address on the customer becomes their default
          isDefault: addresses.length === 0,
        },
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: customerAddressesQueryOptions(customerId).queryKey,
      });
      onSelect(customerAddressToShipping(created));
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to save address");
    },
  });

  function handleConfirm() {
    if (!adding) {
      const picked = addresses.find((a) => a.id === selectedId);
      if (!picked) {
        setError("Select an address.");
        return;
      }
      onSelect(customerAddressToShipping(picked));
      onOpenChange(false);
      return;
    }

    const trimmed: ShippingAddress = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      company: form.company.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      countryCode: form.countryCode.trim().toUpperCase(),
      phone: form.phone.trim(),
    };
    if (REQUIRED.some((k) => !trimmed[k])) {
      setError("Fill in all required address fields.");
      return;
    }
    if (trimmed.countryCode.length !== 2) {
      setError("Country must be a 2-letter code (e.g. US).");
      return;
    }

    if (saveToCustomer) {
      createMutation.mutate(trimmed);
    } else {
      onSelect(trimmed);
      onOpenChange(false);
    }
  }

  const isSaving = createMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Shipping address</SheetTitle>
          <SheetDescription>
            Choose a saved address or enter a new one for this order.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {/* Saved addresses */}
          {hasSaved && (
            <div className="space-y-2">
              {addresses.map((a) => {
                const active = !adding && selectedId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setSelectedId(a.id);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                      active
                        ? "border-amber-400 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        active
                          ? "border-amber-500"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {active && (
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {a.firstName} {a.lastName}
                        {a.isDefault && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[a.line1, a.line2, a.city, a.state, a.postalCode, a.countryCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAdding(true)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border border-dashed px-3.5 py-3 text-left text-sm transition-colors",
                  adding
                    ? "border-amber-400 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <PlusIcon className="h-4 w-4" /> Use a new address
              </button>
            </div>
          )}

          {/* New address form */}
          {adding && (
            <div className="space-y-3">
              {hasSaved && <Separator />}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">First name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company (optional)</Label>
                <Input
                  value={form.company}
                  onChange={(e) => update({ company: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={form.line1}
                  onChange={(e) => update({ line1: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Apartment, suite, etc. (optional)
                </Label>
                <Input
                  value={form.line2}
                  onChange={(e) => update({ line2: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => update({ city: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ZIP / Postal</Label>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => update({ postalCode: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Region / State (optional)</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => update({ state: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country code</Label>
                  <Input
                    value={form.countryCode}
                    onChange={(e) =>
                      update({
                        countryCode: e.target.value.toUpperCase().slice(0, 2),
                      })
                    }
                    maxLength={2}
                    placeholder="US"
                    className="h-8 text-sm uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone (optional)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
                <input
                  type="checkbox"
                  checked={saveToCustomer}
                  onChange={(e) => setSaveToCustomer(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-orange-700"
                />
                Save this address to the customer
              </label>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving}
            className="bg-orange-700 text-white shadow-none hover:bg-orange-800"
          >
            {isSaving ? (
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
            ) : (
              "Use this address"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
