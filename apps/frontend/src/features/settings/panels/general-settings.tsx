import * as React from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { updateStoreServerFn } from "~/server/stores";
import type { Organization, Store } from "~/types/api";
import { organizationQueryOptions, storesQueryOptions } from "../queries";
import { updateOrgServerFn } from "../server";
import { CURRENCIES, TIMEZONES } from "../constants";
import { getActiveStoreId } from "../utils";

export function GeneralSettings() {
  const queryClient = useQueryClient();
  const stores: Store[] = useSuspenseQuery(storesQueryOptions()).data;
  const org: Organization = useSuspenseQuery(organizationQueryOptions()).data;
  const activeId = getActiveStoreId();
  const store = stores.find((s) => s.id === activeId) ?? stores[0];

  const [storeName, setStoreName] = React.useState(store?.name ?? "");
  const [currency, setCurrency] = React.useState(store?.currency ?? "USD");
  const [timezone, setTimezone] = React.useState(store?.timezone ?? "UTC");
  const [orgName, setOrgName] = React.useState(org?.name ?? "");

  React.useEffect(() => {
    if (store) {
      setStoreName(store.name);
      setCurrency(store.currency);
      setTimezone(store.timezone);
    }
  }, [store?.id]);

  React.useEffect(() => {
    if (org) setOrgName(org.name);
  }, [org?.id]);

  const storeSaveMutation = useMutation({
    mutationFn: () =>
      updateStoreServerFn({
        data: { storeId: store!.id, name: storeName.trim(), currency, timezone },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "stores"] });
    },
  });

  const orgSaveMutation = useMutation({
    mutationFn: () => updateOrgServerFn({ data: { name: orgName.trim() } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["settings", "organization"],
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">General</h2>
        <Button
          onClick={() => storeSaveMutation.mutate()}
          disabled={storeSaveMutation.isPending || !store}
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
        >
          {storeSaveMutation.isSuccess ? <CheckIcon className="h-4 w-4" /> : null}
          {storeSaveMutation.isPending
            ? "Saving…"
            : storeSaveMutation.isSuccess
              ? "Saved"
              : "Save"}
        </Button>
      </div>

      {storeSaveMutation.isError && (
        <p className="text-sm text-destructive">
          {storeSaveMutation.error.message}
        </p>
      )}

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">
              Store name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="g-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-slug">Store URL</Label>
            <div className="flex items-center gap-0 max-w-sm">
              <Input
                id="g-slug"
                value={store?.slug ?? ""}
                readOnly
                className="rounded-r-none bg-muted/30 text-muted-foreground"
              />
              <span className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted/30 px-3 text-sm text-muted-foreground whitespace-nowrap">
                .mycommerce.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Read-only — slug is set at store creation.
            </p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="g-currency">
              Default currency <span className="text-destructive">*</span>
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="g-currency" className="max-w-sm">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-tz">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="g-tz" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Organization
            </CardTitle>
            <Button
              size="sm"
              onClick={() => orgSaveMutation.mutate()}
              disabled={orgSaveMutation.isPending || orgName.trim().length < 2}
              className="h-7 gap-1.5 bg-orange-700 px-3 text-xs text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            >
              {orgSaveMutation.isSuccess ? <CheckIcon className="h-3 w-3" /> : null}
              {orgSaveMutation.isPending
                ? "Saving…"
                : orgSaveMutation.isSuccess
                  ? "Saved"
                  : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">
              Organization name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {orgSaveMutation.isError && (
            <p className="text-sm text-destructive">
              {orgSaveMutation.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
