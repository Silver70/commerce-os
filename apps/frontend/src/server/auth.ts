import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { AdminUser } from "~/types/api";

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
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post("/api/auth/login", data);
      forwardSetCookies(res.headers);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const res = await apiClient.post(
        "/api/auth/logout",
        {},
        { headers: { cookie: incomingCookie() } },
      );
      forwardSetCookies(res.headers);
    } catch {
      // swallow — logout should always succeed from the user's perspective
    }
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
    try {
      const res = await apiClient.get<AdminUser>("/api/auth/me", {
        headers: { cookie: incomingCookie() },
      });
      return res.data;
    } catch {
      return null;
    }
  },
);

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const createApiKeyServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1, "Key name is required") }))
  .handler(async ({ data }) => {
    try {
      const res = await apiClient.post<{
        id: string;
        name: string;
        key: string;
        lastUsedAt: string | null;
      }>("/api/auth/admin/api-keys", data, {
        headers: { cookie: incomingCookie() },
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });
