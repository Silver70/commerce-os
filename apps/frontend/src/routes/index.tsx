import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminSessionServerFn } from "~/server/auth";

/**
 * The dashboard has no marketing home page — "/" is purely a router. Signed-out
 * visitors go to the login form, signed-in ones straight to the dashboard.
 *
 * No `redirect` search param is passed to /auth/login: the target would just be
 * "/", and login already defaults to /admin/dashboard via safeRedirectPath.
 */
export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    const session = await getAdminSessionServerFn();
    if (!session) throw redirect({ to: "/auth/login" });

    // Tokens were just rotated: the new cookie is only on the response, so the
    // next hop would still send the stale one. Bounce through a fresh request
    // that carries it. That pass hits the fast path, so this cannot loop.
    if (session.refreshed) throw redirect({ href: location.href });

    throw redirect({ to: "/admin/dashboard" });
  },
  // beforeLoad always throws, so this never renders — it exists only to satisfy
  // the route contract.
  component: () => null,
});
