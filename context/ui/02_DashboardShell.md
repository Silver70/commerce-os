## Dashboard shell breakdown


I want you to create a dashboard shell layout similiar to shadcn dashbords
but since this is remix 3 and there is no react and we using raw css we
cant exactly just copy or install shadcn components so here is a breakdown of
how shadcn implements dashboard and than i want you to just translate it to remix 3 v
version code

## how  shadcn dashboards are architected 

1. The Global Architecture Overview
A Shadcn dashboard is constructed symmetrically from the outside in. Every single layer has a dedicated structural responsibility:

[SidebarProvider]  <-- Global React Context State (Expanded/Collapsed/Mobile)
 └── [Layout Wrapper] (flex min-h-screen w-full)
      ├── <AppSidebar />  <-- Left-hand Nav Grid / Floating Panel
      └── [SidebarInset]  <-- Right-hand Main App Container
           ├── <SiteHeader />  <-- Breadcrumbs, Global Search, User Button
           └── <main>  <-- Dynamic Page Content Grid (Cards, Charts, Tables)
2. Layer 1: The State & Grid Foundation (SidebarProvider)
At the root of any complex Shadcn dashboard sits the SidebarProvider (located in components/ui/sidebar.tsx).

The React Context Track
Instead of relying on fragile CSS media queries or complex DOM hacking to toggle sidebars, Shadcn uses a tightly scoped React Context hook (useSidebar). It exposes:

state: "expanded" | "collapsed"

openMobile: boolean

isMobile: Evaluated using a custom React useMediaQuery hook checking against Tailwind's md (768px) breakpoint.

The CSS Variable Bridge
To prevent layout shift when a sidebar expands or collapses, Shadcn passes down CSS variables through the provider inline, which Tailwind reads dynamically:  

TypeScript
<SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-mobile": "18rem" }}>
Inside the stylesheet, Tailwind maps utility classes to these variables, shifting the layout smoothly using standard CSS transitions.

3. Layer 2: The Core Layout (Sidebar & SidebarInset)
The primary scaffolding splits the screen into a dual-axis layout.

TypeScript
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" /> 
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <SidebarTrigger />
          <Breadcrumbs />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <DashboardGrid />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
The Sidebar Primitive
The <Sidebar/> component behaves differently based on props:

variant="sidebar": Standard flat vertical bar pinned to the edge.

variant="inset": Gives the main content a rounded container aesthetic, making the sidebar feel like it's floating in its own channel.

collapsible="icon": When closed, it safely morphs down to a 16rem -> 3rem strip, hiding text and showing only icons via conditional Tailwind classes (group-data-[state=collapsed]:hidden).

The SidebarInset Primitive
The <SidebarInset/> handles the right-side layout. It uses a flexible standard grid layout (flex flex-1 flex-col) ensuring that if the sidebar collapses, the main container seamlessly expands to fill the remaining screen space.

4. Layer 3: Nav Blocks Composability
Inside <AppSidebar/>, Shadcn completely abandons monolithic arrays of links. Instead, the elements are treated like specialized sub-atomic components:

TypeScript
<Sidebar>
  <SidebarHeader><TeamSwitcher /></SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive>
              <a href="/analytics"><BarChart /> <span>Analytics</span></a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter><NavUser /></SidebarFooter>
</Sidebar>
asChild implementation: Built via Radix UI's slot primitive. This allows you to style <SidebarMenuButton> but natively swap out the underlying HTML element for a Next.js <Link> or a standard React Router link without breaking semantic HTML.

Skeleton States Built-In: Because it uses structured components, loading states are tackled by dropping <SidebarMenuSkeleton/> arrays directly into the existing hierarchy.

5. Layer 4: The Main View Grid & Theming
Inside the dynamic content view (<main>), dashboards rely heavily on Tailwind CSS Grid/Flexbox and Radix Primitives.

The Bento Grid Layout
Most cards and charts are laid out using container queries or native Tailwind responsive grids:

TypeScript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>{/* Metric */}</Card>
  <Card>{/* Metric */}</Card>
</div>
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
  <Card className="col-span-4">{/* Main Chart */}</Card>
  <Card className="col-span-3">{/* Recent Sales Table */}</Card>
</div>