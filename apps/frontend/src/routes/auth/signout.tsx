import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminLogoutServerFn } from "~/server/auth";
import {
  clearActiveStoreCookieServerFn,
  clearOnboardingCookieServerFn,
} from "~/server/stores";

export const Route = createFileRoute("/auth/signout")({
  loader: async () => {
    await Promise.allSettled([
      clearActiveStoreCookieServerFn(),
      clearOnboardingCookieServerFn(),
    ]);
    // Revokes the refresh token server-side and clears the session cookies.
    await adminLogoutServerFn();
    throw redirect({ to: "/auth/login" });
  },
});
