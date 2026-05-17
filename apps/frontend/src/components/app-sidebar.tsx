import * as React from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboardIcon,
  PackageIcon,
  BoxesIcon,
  ShoppingCartIcon,
  UsersIcon,
  PercentIcon,
  TruckIcon,
  SettingsIcon,
  ChevronsUpDownIcon,
  UserIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "~/components/ui/sidebar"

const currentUser = {
  name: "Silver",
  email: "jsameeu@gmail.com",
  initials: "S",
}

type NavItem = {
  title: string
  url: string
  icon: React.ElementType
}

const primaryNav: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboardIcon },
  { title: "Products",  url: "/admin/products",  icon: PackageIcon         },
  { title: "Inventory", url: "/admin/inventory", icon: BoxesIcon            },
  { title: "Orders",    url: "/admin/orders",    icon: ShoppingCartIcon     },
  { title: "Customers", url: "/admin/customers", icon: UsersIcon            },
  { title: "Discounts", url: "/admin/discounts", icon: PercentIcon          },
]

const secondaryNav: NavItem[] = [
  { title: "Shipping", url: "/admin/shipping", icon: TruckIcon    },
  { title: "Settings", url: "/admin/settings", icon: SettingsIcon },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === item.url || pathname.startsWith(item.url + "/")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        size="lg"
        className="[&>svg]:size-5"
      >
        <Link to={item.url}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>

      <SidebarHeader className="h-16 border-b p-0">
        <div className="flex h-full w-full items-center group-data-[collapsible=icon]:justify-center">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2.5 px-4 group-data-[collapsible=icon]:px-0"
          >
            <img
              src="/logo-commerceos.svg"
              alt="Commerce OS"
              className="h-8 w-8 shrink-0"
            />
            <span className="group-data-[collapsible=icon]:hidden font-bold text-sm  overflow-hidden whitespace-nowrap">
              COMMERCE OS
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">

        {/* Primary: Dashboard → Discounts */}
        <SidebarGroup>
          <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5">
            {primaryNav.map((item) => (
              <NavLink key={item.title} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Secondary: Shipping, Settings */}
        <SidebarGroup>
          <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5">
            {secondaryNav.map((item) => (
              <NavLink key={item.title} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-sm font-medium">
                      {currentUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="font-medium truncate">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start" sideOffset={8}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BellIcon className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Rail: click the edge to collapse/expand on desktop */}
      <SidebarRail />
    </Sidebar>
  )
}
