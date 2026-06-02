import { createFileRoute } from "@tanstack/react-router";
import { signOut } from "@workos/authkit-tanstack-react-start";
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
    await signOut();
  },
});
