import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ShieldIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { ApiKey } from "~/types/api";
import { apiKeysQueryOptions, storesQueryOptions } from "../queries";
import { deleteApiKeyServerFn } from "../server";
import { getActiveStoreId } from "../utils";
import { GenerateKeySheet } from "../components/generate-key-sheet";

export function ApiKeysSettings() {
  const queryClient = useQueryClient();
  const { data: stores = [] } = useQuery(storesQueryOptions());
  const activeId = getActiveStoreId();
  const activeStore = stores.find((s) => s.id === activeId) ?? stores[0];
  const storeId = activeStore?.id ?? "";

  const { data: keys = [] } = useQuery(apiKeysQueryOptions(storeId));
  const [genOpen, setGenOpen] = React.useState(false);
  const [revokeError, setRevokeError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  function handleCopyPrefix(keyId: string, prefix: string) {
    navigator.clipboard.writeText(prefix).catch(() => {});
    setCopiedId(keyId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) =>
      deleteApiKeyServerFn({ data: { keyId, storeId } }),
    onMutate: async (keyId) => {
      await queryClient.cancelQueries({
        queryKey: ["settings", "api-keys", storeId],
      });
      const previousKeys = queryClient.getQueryData<ApiKey[]>([
        "settings",
        "api-keys",
        storeId,
      ]);
      queryClient.setQueryData<ApiKey[]>(
        ["settings", "api-keys", storeId],
        (old) => old?.filter((k) => k.id !== keyId) ?? [],
      );
      setRevokeError(null);
      return { previousKeys };
    },
    onError: (err, _keyId, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(
          ["settings", "api-keys", storeId],
          context.previousKeys,
        );
      }
      setRevokeError(err.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["settings", "api-keys", storeId],
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <Button
          className="gap-2 px-5"
          onClick={() => setGenOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Generate key
        </Button>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_180px_120px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Key prefix</span>
          <span>Last used</span>
          <span />
        </div>
        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <KeyIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No API keys. Generate one to connect your storefront.
            </p>
          </div>
        ) : (
          keys.map((k, i) => (
            <div
              key={k.id}
              className={cn(
                "grid grid-cols-[1fr_180px_120px_40px] items-center px-5 py-4",
                i < keys.length - 1 && "border-b border-border/50",
              )}
            >
              <span className="text-sm font-medium">{k.name}</span>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-sm text-muted-foreground">
                  {k.keyPrefix}…
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopyPrefix(k.id, k.keyPrefix)}
                  title="Copy key prefix"
                >
                  {copiedId === k.id ? (
                    <CheckIcon className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <CopyIcon className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <span
                className={cn(
                  "text-sm",
                  k.lastUsedAt
                    ? "text-muted-foreground"
                    : "italic text-muted-foreground/60",
                )}
              >
                {k.lastUsedAt
                  ? new Date(k.lastUsedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Never"}
              </span>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteMutation.mutate(k.id)}
                    >
                      Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </Card>

      {revokeError && <p className="text-sm text-destructive">{revokeError}</p>}

      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
        <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          API keys grant full access to your store data. Only share them with
          trusted applications.
        </p>
      </div>

      <GenerateKeySheet
        open={genOpen}
        onOpenChange={setGenOpen}
        storeId={storeId}
        storeName={activeStore?.name ?? ""}
      />
    </div>
  );
}
