import { createFileRoute, redirect } from "@tanstack/react-router";

// Email verification isn't implemented yet — send users to sign-in.
export const Route = createFileRoute("/auth/verify-email")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/login" });
  },
});
