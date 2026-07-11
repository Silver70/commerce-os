import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  ShieldIcon,
  StoreIcon,
  TriangleAlertIcon,
} from "lucide-react";
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
} from "~/components/ui/sheet";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { TimezoneCombobox } from "~/components/timezone-combobox";
import { createStoreInAppServerFn } from "~/server/stores";
import { createApiKeyFromSettingsServerFn } from "../server";

// Creating a store also mints its first storefront API key, mirroring the
// onboarding flow (step1 creates the store, step3 reveals the key). We do both
// here so the new store is immediately usable by a storefront, and reveal the
// raw key exactly once.
export function AddStoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("UTC");
  const [genKey, setGenKey] = React.useState("");
  const [keyError, setKeyError] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setCurrency("USD");
      setTimezone("UTC");
      setGenKey("");
      setKeyError("");
      setCopied(false);
      setError("");
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const store = await createStoreInAppServerFn({
        data: { name: name.trim(), currency, timezone },
      });
      // A key-generation failure must not lose the created store: surface it on
      // step 2 and point the user to Settings › API Keys instead of failing.
      try {
        const key = await createApiKeyFromSettingsServerFn({
          data: { name: `${store.name} Storefront`, storeId: store.id },
        });
        return { rawKey: key.rawKey, keyError: "" };
      } catch (e) {
        return {
          rawKey: "",
          keyError: e instanceof Error ? e.message : "Failed to generate key",
        };
      }
    },
    onSuccess: ({ rawKey, keyError: kErr }) => {
      setGenKey(rawKey);
      setKeyError(kErr);
      setStep(2);
      // The active store just switched to the new (empty) store — refetch every
      // store-scoped query so the whole admin reflects it.
      void queryClient.invalidateQueries();
    },
    onError: (err) => setError(err.message),
  });

  function handleCopy() {
    navigator.clipboard.writeText(genKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {step === 1 ? "Add a store" : "Store created"}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? "Create another storefront in this organization. It starts with an empty catalog and its own API key."
              : "You're now managing the new store. Copy its API key — it won't be shown again."}
          </SheetDescription>
        </SheetHeader>

        {step === 1 ? (
          <>
            <div className="flex-1 space-y-4 px-4 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-store-name">
                  Store name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-store-name"
                  placeholder="My Second Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-store-currency">
                    Currency <span className="text-destructive">*</span>
                  </Label>
                  <CurrencyCombobox
                    id="new-store-currency"
                    value={currency}
                    onChange={setCurrency}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-store-tz">
                    Timezone <span className="text-destructive">*</span>
                  </Label>
                  <TimezoneCombobox
                    id="new-store-tz"
                    value={timezone}
                    onChange={setTimezone}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
                <StoreIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Creating this store switches your active store to it. You can
                  switch back anytime from the store menu.
                </span>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <SheetFooter className="border-t">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                disabled={name.trim().length < 2 || createMutation.isPending}
                className="flex-1"
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating…" : "Create store"}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="flex-1 space-y-5 px-4 py-5">
              {keyError ? (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    The store was created, but we couldn't generate its API key:{" "}
                    {keyError}. Generate one from{" "}
                    <strong>Settings › API Keys</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      This key is shown <strong>only once</strong>. Copy it now —
                      you will not be able to retrieve it later.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Storefront API key</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                        {genKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <CopyIcon className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <SheetFooter className="border-t">
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
