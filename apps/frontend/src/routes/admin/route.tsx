import * as React from "react"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import {
  SearchIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  CheckIcon,
} from "lucide-react"

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

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

const stores = [
  { id: "1", name: "Main Store" },
  { id: "2", name: "Outlet Store" },
]

function StoreSwitcher() {
  const [active, setActive] = React.useState(stores[0])

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
          <DropdownMenuItem key={store.id} onSelect={() => setActive(store)}>
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
              <StoreSwitcher />
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
