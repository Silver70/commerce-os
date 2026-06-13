import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { createCustomerAddressServerFn } from "../server";
import { customerAddressesQueryOptions, customerQueryOptions } from "../queries";

type AddressForm = {
  firstName: string;
  lastName: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  phone: string;
};

const EMPTY: AddressForm = {
  firstName: "",
  lastName: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "US",
  phone: "",
};

const REQUIRED: (keyof AddressForm)[] = [
  "firstName",
  "lastName",
  "line1",
  "city",
  "postalCode",
];

/** Add a new address to a customer. The first address is set as default by
 *  default; the backend clears any previous default when isDefault is set. */
export function AddAddressSheet({
  customerId,
  hasExisting,
  firstName,
  lastName,
}: {
  customerId: string;
  hasExisting: boolean;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  // Prefill the recipient name from the customer record; still editable.
  const makeInitialForm = React.useCallback(
    (): AddressForm => ({
      ...EMPTY,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
    }),
    [firstName, lastName],
  );

  const [form, setForm] = React.useState<AddressForm>(makeInitialForm);
  const [isDefault, setIsDefault] = React.useState(!hasExisting);
  const [error, setError] = React.useState<string | null>(null);

  const update = (patch: Partial<AddressForm>) =>
    setForm((p) => ({ ...p, ...patch }));

  function resetForm() {
    setForm(makeInitialForm());
    setIsDefault(!hasExisting);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  const mutation = useMutation({
    mutationFn: () => {
      const t = {
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
      return createCustomerAddressServerFn({
        data: {
          customerId,
          firstName: t.firstName,
          lastName: t.lastName,
          company: t.company || undefined,
          line1: t.line1,
          line2: t.line2 || undefined,
          city: t.city,
          state: t.state || undefined,
          postalCode: t.postalCode,
          countryCode: t.countryCode,
          phone: t.phone || undefined,
          isDefault,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerAddressesQueryOptions(customerId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: customerQueryOptions(customerId).queryKey,
      });
      handleOpenChange(false);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to add address"),
  });

  function handleSubmit() {
    if (REQUIRED.some((k) => !form[k].trim())) {
      setError("Fill in all required address fields.");
      return;
    }
    if (form.countryCode.trim().length !== 2) {
      setError("Country must be a 2-letter code (e.g. US).");
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <PlusIcon className="h-3.5 w-3.5" />
          Add address
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Add address</SheetTitle>
          <SheetDescription>
            Save a shipping address to this customer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-first">First name</Label>
              <Input
                id="addr-first"
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-last">Last name</Label>
              <Input
                id="addr-last"
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-company">
              Company{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="addr-company"
              value={form.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-line1">Address</Label>
            <Input
              id="addr-line1"
              placeholder="Street address"
              value={form.line1}
              onChange={(e) => update({ line1: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-line2">
              Apartment, suite, etc.{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="addr-line2"
              value={form.line2}
              onChange={(e) => update({ line2: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-city">City</Label>
              <Input
                id="addr-city"
                value={form.city}
                onChange={(e) => update({ city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-postal">ZIP / Postal</Label>
              <Input
                id="addr-postal"
                value={form.postalCode}
                onChange={(e) => update({ postalCode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-state">
                Region / State{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="addr-state"
                value={form.state}
                onChange={(e) => update({ state: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-country">Country code</Label>
              <Input
                id="addr-country"
                maxLength={2}
                placeholder="US"
                className="uppercase"
                value={form.countryCode}
                onChange={(e) =>
                  update({
                    countryCode: e.target.value.toUpperCase().slice(0, 2),
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-phone">
              Phone{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="addr-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-orange-700"
            />
            Set as default address
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 py-3">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={mutation.isPending}
            onClick={handleSubmit}
            className="flex-1 bg-orange-700 py-3 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Add address"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
