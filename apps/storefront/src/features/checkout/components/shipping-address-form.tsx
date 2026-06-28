import * as React from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" error={errors.city}>
          <Input autoComplete="address-level2" {...text("city")} />
        </Field>
        <Field label="State / Province (optional)" error={errors.state}>
          <Input autoComplete="address-level1" {...text("state")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Postal code" error={errors.postalCode}>
          <Input autoComplete="postal-code" {...text("postalCode")} />
        </Field>
        <Field label="Country code" error={errors.countryCode}>
          <Input
            autoComplete="country"
            placeholder="US"
            maxLength={2}
            value={value.countryCode}
            aria-invalid={Boolean(errors.countryCode)}
            onChange={(e) =>
              onChange({ countryCode: e.target.value.toUpperCase() })
            }
          />
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
