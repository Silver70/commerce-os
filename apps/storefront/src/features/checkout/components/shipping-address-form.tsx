import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { countries } from "~/config/countries";
import type { ShippingAddressErrors, ShippingAddressFormState } from "../types";

interface ShippingAddressFormProps {
  value: ShippingAddressFormState;
  errors: ShippingAddressErrors;
  onChange: (patch: Partial<ShippingAddressFormState>) => void;
}

/** Controlled contact + shipping address form (Zod-validated on submit). */
export function ShippingAddressForm({
  value,
  errors,
  onChange,
}: ShippingAddressFormProps) {
  const text = (key: keyof ShippingAddressFormState) => ({
    value: value[key],
    "aria-invalid": Boolean(errors[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [key]: e.target.value }),
  });

  return (
    <div className="space-y-4">
      <Field label="Email" error={errors.email}>
        <Input type="email" autoComplete="email" {...text("email")} />
      </Field>

      {/* Country first — it determines available shipping rates. */}
      <Field label="Country / region" error={errors.countryCode}>
        <div className="relative">
          <select
            autoComplete="country"
            aria-invalid={Boolean(errors.countryCode)}
            value={value.countryCode}
            onChange={(e) => onChange({ countryCode: e.target.value })}
            className={cn(
              "h-8 w-full appearance-none rounded-lg border border-input bg-transparent pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
              !value.countryCode && "text-muted-foreground",
            )}
          >
            <option value="" disabled>
              Select a country…
            </option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={errors.firstName}>
          <Input autoComplete="given-name" {...text("firstName")} />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <Input autoComplete="family-name" {...text("lastName")} />
        </Field>
      </div>

      <Field label="Company (optional)" error={errors.company}>
        <Input autoComplete="organization" {...text("company")} />
      </Field>

      <Field label="Address" error={errors.line1}>
        <Input autoComplete="address-line1" {...text("line1")} />
      </Field>

      <Field label="Apartment, suite, etc. (optional)" error={errors.line2}>
        <Input autoComplete="address-line2" {...text("line2")} />
      </Field>

      <Field label="City" error={errors.city}>
        <Input autoComplete="address-level2" {...text("city")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="State / province (optional)" error={errors.state}>
          <Input autoComplete="address-level1" {...text("state")} />
        </Field>
        <Field label="Postal code" error={errors.postalCode}>
          <Input autoComplete="postal-code" {...text("postalCode")} />
        </Field>
      </div>

      <Field label="Phone (optional)" error={errors.phone}>
        <Input type="tel" autoComplete="tel" {...text("phone")} />
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
