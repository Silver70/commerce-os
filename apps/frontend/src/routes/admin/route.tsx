import * as React from "react"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import {
  SearchIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  CheckIcon,
} from "lucide-react"
import {
  getAuth,
  getSignInUrl,
  switchToOrganization,
} from "@workos/authkit-tanstack-react-start"

import { AppSidebar } from "~/components/app-sidebar"
import { ThemeToggle } from "~/components/ThemeToggle"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { storesQueryOptions } from "~/features/settings/queries"
import {
  ensureActiveStoreServerFn,
  getOnboardingStepServerFn,
  setActiveStoreServerFn,
} from "~/server/stores"
import { bootstrapOrgServerFn } from "~/server/auth"
import type { Store } from "~/types/api"

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const auth = await getAuth()
    if (!auth.user) throw redirect({ href: await getSignInUrl() })

    const user = auth.user
    const organizationId = (auth as { organizationId?: string }).organizationId

    // First-login: no org yet — provision one then re-mint the session.
    // switchToOrganization sets a fresh session cookie (now carrying org_id +
    // role), but getAuth()/authHeader() within THIS request still hold the
    // pre-switch token — so any backend call below hits RBAC as "No role
    // assigned". Bounce through a fresh request so the re-minted session is the
    // one that's read; this beforeLoad then re-runs with organizationId set.
    if (!organizationId) {
      const { workosOrgId } = await bootstrapOrgServerFn()
      await switchToOrganization({ data: { organizationId: workosOrgId } })
      throw redirect({ to: "/admin" })
    }

    const step = await getOnboardingStepServerFn()
    if (step === "1") throw redirect({ to: "/onboarding/step1" })
    if (step === "2") throw redirect({ to: "/onboarding/step2" })
    if (step === "3") throw redirect({ to: "/onboarding/step3" })

    const stores = await context.queryClient.ensureQueryData(storesQueryOptions())

    // New user: org exists but no stores yet → send to onboarding
    if (stores.length === 0) {
      throw redirect({ to: "/onboarding/step1" })
    }

    await ensureActiveStoreServerFn({
      data: { storeIds: stores.map((s) => s.id), fallbackId: stores[0].id },
    })

    return { user }
  },
  component: AdminLayout,
})

function getActiveStoreId(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)wos-active-store=([^;]*)/)
  return match ? match[1] : null
}

function StoreSwitcher({ stores }: { stores: Store[] }) {
  const queryClient = useQueryClient()
  const activeId = getActiveStoreId()
  const active = stores.find((s) => s.id === activeId) ?? stores[0]

  async function handleSelect(store: Store) {
    await setActiveStoreServerFn({ data: { storeId: store.id } })
    await queryClient.invalidateQueries()
  }

  if (!active) return null

  return (
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
          <DropdownMenuItem key={store.id} onSelect={() => void handleSelect(store)}>
            <Building2Icon className="mr-2 h-4 w-4" />
            {store.name}
            {active.id === store.id && (
              <CheckIcon className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AdminLayout() {
  const { data: stores } = useSuspenseQuery(storesQueryOptions())

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          {/* ── Header bar (aligns with sidebar header at h-16) ── */}
          <header className="flex h-16 shrink-0 items-center border-b bg-background">

              {/* Sidebar trigger — collapses on desktop, opens Sheet on mobile */}
            <SidebarTrigger className="ml-4" />

            {/* Search */}
            <div className="flex flex-1 items-center px-3">
              <Button
                variant="outline"
                className="h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground font-normal"
              >
                <SearchIcon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  Search orders, products, customers…
                </span>
                <span className="sm:hidden">Search…</span>
                <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

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
  )
}
