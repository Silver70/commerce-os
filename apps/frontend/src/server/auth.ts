import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { AdminUser, Store } from "~/types/api";

type OnboardingStep = 1 | 2 | 3 | null;

function forwardSetCookies(headers: Headers): void {
  const values = headers.getSetCookie();
  if (values.length > 0) {
    setResponseHeader("set-cookie", values);
  }
}

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export const signupServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      organizationName: z.string().min(2, "Organization name is required"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post<{ userId: string; email: string }>(
        "/api/auth/signup",
        data,
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyEmailServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      code: z.string().length(6, "Code must be 6 digits"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await apiClient.post("/api/auth/verify-email", data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }),
  )
  .handler(async ({ data }): Promise<{ onboardingStep: OnboardingStep }> => {
    try {
      const res = await apiClient.post("/api/auth/login", data);
      console.log("[login] backend status:", res.status);
      console.log(
        "[login] response headers keys:",
        typeof res.headers,
        res.headers instanceof Headers,
      );
      const setCookies = res.headers.getSetCookie?.() ?? [];
      console.log("[login] getSetCookie() count:", setCookies.length);
      console.log(
        "[login] getSetCookie() values:",
        setCookies.map((c) => c.slice(0, 60)),
      );
      forwardSetCookies(res.headers);

      const sessionStr = setCookies.find((c) => c.startsWith("wos-session="));
      const sessionCookie = sessionStr?.split(";")[0] ?? "";
      console.log(
        "[login] extracted sessionCookie:",
        sessionCookie ? sessionCookie.slice(0, 40) + "..." : "(empty)",
      );

      let onboardingStep: OnboardingStep = null;

      if (sessionCookie) {
        try {
          const storesRes = await apiClient.get<Store[]>("/api/admin/stores", {
            headers: { cookie: sessionCookie },
          });
          const stores = storesRes.data;
          console.log("[login] stores fetched:", stores.length);

          if (stores.length === 0) {
            setCookie("wos-onboarding-step", "1", {
              path: "/",
              sameSite: "lax",
              maxAge: 30 * 24 * 60 * 60,
            });
            onboardingStep = 1;
          } else {
            setCookie("wos-active-store", stores[0].id, {
              path: "/",
              sameSite: "lax",
              maxAge: 30 * 24 * 60 * 60,
            });
            // Read the in-progress onboarding step from the incoming request
            // cookie (set by a previous session that was interrupted mid-flow).
            const inProgress = getCookie("wos-onboarding-step");
            if (inProgress === "2") onboardingStep = 2;
            else if (inProgress === "3") onboardingStep = 3;
            else if (inProgress === "1") {
              // Stale "1" cookie — store now exists, clear it
              setCookie("wos-onboarding-step", "", { path: "/", maxAge: 0 });
            }
          }
        } catch {
          // Non-fatal — login still succeeds, user lands on dashboard
        }
      }

      return { onboardingStep };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      await apiClient.post(
        "/api/auth/logout",
        {},
        { headers: { cookie: incomingCookie() } },
      );
    } catch {
      // swallow — logout should always succeed from the user's perspective
    }
    // Expire the session cookie directly rather than relying on the backend's
    // Set-Cookie forwarding (204 No Content responses are unreliable for this).
    setCookie("wos-session", "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });
  },
);

// ─── Resend Verification ──────────────────────────────────────────────────────

export const resendVerificationServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await apiClient.post("/api/auth/resend-verification", {
        userId: data.userId,
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Me ───────────────────────────────────────────────────────────────────────

export const getMeServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUser | null> => {
    const cookie = incomingCookie();
    const hasSession = cookie.includes("wos-session=");
    console.log(
      "[me] incoming cookie:",
      cookie ? cookie.slice(0, 80) : "(none)",
      "| has wos-session:",
      hasSession,
    );
    try {
      const res = await apiClient.get<AdminUser>("/api/auth/me", {
        headers: { cookie },
      });
      console.log("[me] success:", res.status, "user:", res.data?.email);
      return res.data;
    } catch (err) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      console.log(
        "[me] FAILED — status:",
        status,
        "| message:",
        getErrorMessage(err),
      );
      return null;
    }
  },
);

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const createApiKeyServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1, "Key name is required") }))
  .handler(async ({ data }) => {
    const storeId = getCookie("wos-active-store");
    if (!storeId) throw new Error("No active store — complete onboarding step 1 first");
    try {
      const res = await apiClient.post<{
        id: string;
        name: string;
        key: string;
        lastUsedAt: string | null;
      }>(`/api/admin/stores/${storeId}/api-keys`, data, {
        headers: { cookie: incomingCookie(), "X-Store-Id": storeId },
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
