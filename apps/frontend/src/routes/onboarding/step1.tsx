import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, LoaderCircleIcon } from "lucide-react";
import { z } from "zod";
import { Logo } from "~/components/Logo";
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
  getStoresServerFn,
  setActiveStoreServerFn,
  updateStoreServerFn,
} from "~/server/stores";
import type { Store } from "~/types/api";

export const Route = createFileRoute("/onboarding/step1")({
  component: OnboardingStep1,
});

const step1Schema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters"),
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

type StoreLoadState =
  | { status: "loading" }
  | { status: "ready"; store: Store }
  | { status: "error"; message: string };

function OnboardingStep1() {
  const navigate = useNavigate();

  const [storeLoad, setStoreLoad] = React.useState<StoreLoadState>({
    status: "loading",
  });
  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("UTC");
  const [errors, setErrors] = React.useState<Step1Errors>({});
  const [apiError, setApiError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    getStoresServerFn()
      .then((stores) => {
        if (cancelled) return;
        const defaultStore = stores.find((s) => s.isActive) ?? stores[0];
        if (!defaultStore) {
          setStoreLoad({
            status: "error",
            message: "No store found for this account",
          });
          return;
        }
        setName(defaultStore.name);
        setCurrency(defaultStore.currency);
        setTimezone(defaultStore.timezone);
        setStoreLoad({ status: "ready", store: defaultStore });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load store";
          setStoreLoad({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (storeLoad.status !== "ready") return;
    setApiError("");

    const result = step1Schema.safeParse({ name, currency, timezone });
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
      await updateStoreServerFn({
        data: { storeId: storeLoad.store.id, ...result.data },
      });
      await setActiveStoreServerFn({ data: { storeId: storeLoad.store.id } });
      sessionStorage.setItem(
        "onboarding_state",
        JSON.stringify({ storeId: storeLoad.store.id, currency, timezone }),
      );
      void navigate({ to: "/onboarding/step2" });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const isLoading = storeLoad.status === "loading";

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Set up your store
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your store's name, currency, and timezone
          </p>
        </div>

        <StepDots current={1} />

        <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest mb-5">
          Step 1 of 3 — Store details
        </p>

        {storeLoad.status === "error" ? (
          <p className="text-sm text-destructive">{storeLoad.message}</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="store-name">
                Store name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="store-name"
                  placeholder="Acme Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={!!errors.name}
                />
                {isLoading && (
                  <LoaderCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {errors.name && (
                <p className="text-xs text-destructive pl-0.5">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currency">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                  disabled={isLoading}
                >
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
                <Select
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={isLoading}
                >
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
                disabled={pending || isLoading}
              >
                {pending ? "Saving…" : "Continue"}
                {!pending && <ChevronRightIcon />}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
