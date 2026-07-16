import * as React from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  ChevronsUpDownIcon,
  CheckIcon,
  PlusIcon,
} from "lucide-react";
import { AppSidebar } from "~/components/app-sidebar";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";
import { storesQueryOptions } from "~/features/settings/queries";
import { AddStoreSheet } from "~/features/settings/components/add-store-sheet";
import {
  ensureActiveStoreServerFn,
  getOnboardingStepServerFn,
  setActiveStoreServerFn,
} from "~/server/stores";
import { getAdminSessionServerFn } from "~/server/auth";
import type { Store } from "~/types/api";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context, location }) => {
    // Refreshes the access token when stale — the single refresh point per
    // navigation, so every server fn below sees a fresh cookie.
    const session = await getAdminSessionServerFn();
    if (!session) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }

    // Tokens were just rotated: the new cookie is only on the response, so every
    // server fn below would still send the stale token. Bounce through a fresh
    // request that carries it. The next pass hits the fast path (no refresh), so
    // this cannot loop.
    if (session.refreshed) throw redirect({ href: location.href });

    // No org bootstrap needed: registration creates the org + membership, so a
    // signed-in session always carries an organizationId.

    const step = await getOnboardingStepServerFn();
    if (step === "1") throw redirect({ to: "/onboarding/step1" });
    if (step === "2") throw redirect({ to: "/onboarding/step2" });
    if (step === "3") throw redirect({ to: "/onboarding/step3" });

    const stores =
      await context.queryClient.ensureQueryData(storesQueryOptions());

    // New user: org exists but no stores yet → send to onboarding
    if (stores.length === 0) {
      throw redirect({ to: "/onboarding/step1" });
    }

    await ensureActiveStoreServerFn({
      data: { storeIds: stores.map((s) => s.id), fallbackId: stores[0].id },
    });

    return { session };
  },
  component: AdminLayout,
});

function getActiveStoreId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)wos-active-store=([^;]*)/);
  return match ? match[1] : null;
}

function StoreSwitcher({ stores }: { stores: Store[] }) {
  const queryClient = useQueryClient();
  const activeId = getActiveStoreId();
  const active = stores.find((s) => s.id === activeId) ?? stores[0];
  const [addOpen, setAddOpen] = React.useState(false);

  async function handleSelect(store: Store) {
    await setActiveStoreServerFn({ data: { storeId: store.id } });
    await queryClient.invalidateQueries();
  }

  if (!active) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 font-normal">
            <Building2Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{active.name}</span>
            <ChevronsUpDownIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Switch store</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {stores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onSelect={() => void handleSelect(store)}
            >
              <Building2Icon className="mr-2 h-4 w-4" />
              {store.name}
              {active.id === store.id && (
                <CheckIcon className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAddOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add store
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddStoreSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function AdminLayout() {
  const { data: stores } = useSuspenseQuery(storesQueryOptions());

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          {/* ── Header bar (aligns with sidebar header at h-16) ── */}
          <header className="flex h-16 shrink-0 items-center border-b bg-background">
            {/* Sidebar trigger — collapses on desktop, opens Sheet on mobile */}
            <SidebarTrigger className="ml-4" />

            <div className="flex-1" />

            {/* Right: store switcher + theme toggle */}
            <div className="flex items-center gap-2 pr-4">
              <StoreSwitcher stores={stores} />
              <ThemeToggle />
            </div>
          </header>

          {/* Page content */}
          <div className="flex flex-1 flex-col p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
