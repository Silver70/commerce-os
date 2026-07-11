import * as React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  CheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  StoreIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  deleteStoreServerFn,
  setActiveStoreServerFn,
  setStoreActiveServerFn,
} from "~/server/stores";
import type { Store } from "~/types/api";
import { storesQueryOptions } from "../queries";
import { getActiveStoreId } from "../utils";
import { AddStoreSheet } from "../components/add-store-sheet";

export function StoresSettings() {
  const queryClient = useQueryClient();
  const stores: Store[] = useSuspenseQuery(storesQueryOptions()).data;
  const activeId = getActiveStoreId();
  const [addOpen, setAddOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const enabledCount = stores.filter((s) => s.isActive).length;

  // Refetch the store list; when the currently-selected store changed, refetch
  // every store-scoped query so the whole admin follows the switch.
  function invalidate(activeStoreChanged: boolean) {
    if (activeStoreChanged) return queryClient.invalidateQueries();
    return queryClient.invalidateQueries({ queryKey: ["settings", "stores"] });
  }

  // When the selected store is disabled or deleted, move selection to another
  // enabled store so the admin never lands on a store the backend won't honor.
  async function reselectAwayFrom(storeId: string): Promise<boolean> {
    if (activeId !== storeId) return false;
    const next = stores.find((s) => s.id !== storeId && s.isActive);
    if (next) await setActiveStoreServerFn({ data: { storeId: next.id } });
    return true;
  }

  const switchMutation = useMutation({
    mutationFn: (storeId: string) =>
      setActiveStoreServerFn({ data: { storeId } }),
    onSuccess: () => {
      setError(null);
      void invalidate(true);
    },
    onError: (err) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (store: Store) => {
      await setStoreActiveServerFn({
        data: { storeId: store.id, isActive: !store.isActive },
      });
      // Disabling the selected store → hand selection to another enabled store.
      return store.isActive ? reselectAwayFrom(store.id) : false;
    },
    onSuccess: (activeChanged) => {
      setError(null);
      void invalidate(activeChanged);
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (store: Store) => {
      const activeChanged = await reselectAwayFrom(store.id);
      await deleteStoreServerFn({ data: { storeId: store.id } });
      return activeChanged;
    },
    onSuccess: (activeChanged) => {
      setError(null);
      void invalidate(activeChanged);
    },
    onError: (err) => setError(err.message),
  });

  const busy =
    switchMutation.isPending ||
    toggleMutation.isPending ||
    deleteMutation.isPending;

  function handleDelete(store: Store) {
    if (
      window.confirm(
        `Delete “${store.name}”? Its catalog, orders, and API keys become inaccessible. This can't be undone from the dashboard.`,
      )
    ) {
      deleteMutation.mutate(store);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Stores</h2>
          <p className="text-sm text-muted-foreground">
            Each store is an independent storefront with its own catalog,
            orders, and API keys.
          </p>
        </div>
        <Button className="gap-2 px-5" onClick={() => setAddOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Add store
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="gap-0 overflow-hidden py-0">
        {stores.map((store, i) => {
          const isCurrent = store.id === activeId;
          const isOnlyStore = stores.length === 1;
          const isOnlyEnabled = store.isActive && enabledCount === 1;

          return (
            <div
              key={store.id}
              className={cn(
                "flex items-center gap-3 px-5 py-4",
                i < stores.length - 1 && "border-b border-border/50",
                isCurrent && "bg-muted/30",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {store.name}
                  </span>
                  {isCurrent && <Badge>Current</Badge>}
                  {!store.isActive && <Badge variant="outline">Disabled</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {store.slug} · {store.currency} · {store.timezone}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    disabled={busy}
                  >
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    disabled={isCurrent || !store.isActive}
                    onClick={() => switchMutation.mutate(store.id)}
                  >
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Switch to this store
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isOnlyEnabled}
                    onClick={() => toggleMutation.mutate(store)}
                  >
                    {store.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isOnlyStore}
                    onClick={() => handleDelete(store)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </Card>

      <AddStoreSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
