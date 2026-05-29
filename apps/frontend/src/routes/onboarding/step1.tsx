import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { z } from "zod";
import { Logo } from "~/components/Logo";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { updateOrgServerFn } from "~/server/settings";

export const Route = createFileRoute("/onboarding/step1")({
  component: OnboardingStep1,
});

const step1Schema = z.object({
  currency: z.string().length(3, "Select a currency"),
  timezone: z.string().min(1, "Select a timezone"),
});

type Step1Fields = z.infer<typeof step1Schema>;
type Step1Errors = Partial<Record<keyof Step1Fields, string>>;

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-5 h-2 bg-foreground"
              : n < current
                ? "w-2 h-2 bg-muted-foreground/50"
                : "w-2 h-2 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function OnboardingStep1() {
  const navigate = useNavigate();
  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("UTC");
  const [errors, setErrors] = React.useState<Step1Errors>({});
  const [apiError, setApiError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError("");

    const result = step1Schema.safeParse({ currency, timezone });
    if (!result.success) {
      const fieldErrors: Step1Errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Step1Fields;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setPending(true);
    try {
      await updateOrgServerFn({ data: result.data });
      sessionStorage.setItem(
        "onboarding_state",
        JSON.stringify({ currency, timezone }),
      );
      void navigate({ to: "/onboarding/step2" });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Set up your store
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your store's currency and timezone
          </p>
        </div>

        <StepDots current={1} />

        <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest mb-5">
          Step 1 of 3 — Store details
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-xs text-destructive pl-0.5">
                  {errors.currency}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">
                Timezone <span className="text-destructive">*</span>
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && (
                <p className="text-xs text-destructive pl-0.5">
                  {errors.timezone}
                </p>
              )}
            </div>
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError}</p>}

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Saving…" : "Continue"}
              {!pending && <ChevronRightIcon />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
