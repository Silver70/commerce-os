import * as React from "react";
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
import type { ShippingZone } from "~/types/api";
import type { ZoneFormValues } from "../types";
import { CountryPicker } from "./country-picker";

export function ZoneSheet({
  zone,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  zone: ShippingZone | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (values: ZoneFormValues) => void;
  isSaving: boolean;
}) {
  const [name, setName] = React.useState("");
  const [countries, setCountries] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setName(zone?.name ?? "");
      setCountries(zone?.countries ?? []);
    }
  }, [open, zone]);

  const isEdit = !!zone;
  const canSave = name.trim().length > 0 && !isSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit zone" : "Add zone"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the zone name and countries."
              : "Define a new shipping zone and select which countries it covers."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="z-name">
              Zone name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="z-name"
              placeholder="e.g. Europe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Countries</Label>
            <CountryPicker selected={countries} onChange={setCountries} />
          </div>
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!canSave}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => onSave({ name: name.trim(), countries })}
          >
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add zone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
