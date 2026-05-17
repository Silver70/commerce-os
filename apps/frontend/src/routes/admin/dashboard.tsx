import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening with your store.
        </p>
      </div>
    </div>
  )
}
