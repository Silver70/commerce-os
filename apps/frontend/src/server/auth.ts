import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { apiClient, authHeader } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { AdminRole } from "~/types/api";

// ─── Session cookies ──────────────────────────────────────────────────────────
// The access token is short-lived (matches the backend's 1h TTL) and the refresh
// token long-lived (7d). Both are httpOnly so client JS can never read them; only
// server functions attach the access token to API calls (see lib/api-client).

export const ACCESS_COOKIE = "admin-access";
export const REFRESH_COOKIE = "admin-refresh";

const ACCESS_MAX_AGE = 60 * 60; // must match backend ACCESS_TTL ('1h')
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // must match backend REFRESH_TTL_MS (7d)

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: import.meta.env.PROD,
};

type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null };
  organizationId: string;
  role: AdminRole;
};

export type AdminSession = {
  userId: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: AdminRole;
  /**
   * True when this call rotated the tokens and issued fresh cookies. During SSR,
   * `setCookie` only writes to the *response* while `getCookie` keeps reading the
   * original *request* — so any authHeader() later in the same request would still
   * send the stale (expired) token and get a 401. Callers must bounce through a
   * redirect when this is set, so the next request picks up the new cookie.
   */
  refreshed: boolean;
};

type AccessClaims = {
  sub: string;
  org_id: string;
  role: AdminRole;
  email: string;
  exp: number;
};

function persistSession(session: SessionResponse) {
  setCookie(ACCESS_COOKIE, session.accessToken, {
    ...cookieOpts,
    maxAge: ACCESS_MAX_AGE,
  });
  setCookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOpts,
    maxAge: REFRESH_MAX_AGE,
  });
}

function clearSessionCookies() {
  setCookie(ACCESS_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  setCookie(REFRESH_COOKIE, "", { ...cookieOpts, maxAge: 0 });
}

function toSession(res: SessionResponse, refreshed = false): AdminSession {
  return {
    userId: res.user.id,
    email: res.user.email,
    name: res.user.name,
    organizationId: res.organizationId,
    role: res.role,
    refreshed,
  };
}

/**
 * Decode (without verifying) the access token payload. The signature is verified
 * by the backend on every API call — this read is only used to decide whether the
 * token is still fresh and to populate UI context, never to grant access.
 */
function decodeAccessToken(token: string): AccessClaims | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AccessClaims;
  } catch {
    return null;
  }
}

// ─── Login / Register ─────────────────────────────────────────────────────────

export const adminLoginServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email("Enter a valid email"),
      password: z.string().min(1, "Password is required"),
    }),
  )
  .handler(async ({ data }): Promise<AdminSession> => {
    try {
      const res = await apiClient.post<SessionResponse>(
        "/api/auth/admin/login",
        data,
      );
      persistSession(res.data);
      return toSession(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

export const adminRegisterServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email("Enter a valid email"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      orgName: z.string().min(2, "Organization name is required"),
    }),
  )
  .handler(async ({ data }): Promise<AdminSession> => {
    try {
      const res = await apiClient.post<SessionResponse>(
        "/api/auth/admin/register",
        data,
      );
      persistSession(res.data);
      return toSession(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Logout ───────────────────────────────────────────────────────────────────

export const adminLogoutServerFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    const refreshToken = getCookie(REFRESH_COOKIE);
    if (refreshToken) {
      // Best-effort revoke: clear cookies regardless of the backend's response.
      try {
        await apiClient.post("/api/auth/admin/logout", { refreshToken });
      } catch {
        /* ignore — the cookies are cleared below either way */
      }
    }
    clearSessionCookies();
  },
);

// ─── Current session (used by route guards) ───────────────────────────────────

/**
 * Returns the current admin session, transparently refreshing when the access
 * token has expired. This is the ONLY place that refreshes: the backend rotates
 * refresh tokens, so concurrent refreshes would revoke each other. Route
 * beforeLoad calls this once before any data loading, leaving a fresh cookie for
 * every server fn in that navigation.
 */
export const getAdminSessionServerFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<AdminSession | null> => {
  const accessToken = getCookie(ACCESS_COOKIE);
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  // Fast path: token still valid (5s skew guards against expiry mid-request).
  if (claims && claims.exp * 1000 > Date.now() + 5_000) {
    return {
      userId: claims.sub,
      email: claims.email,
      name: null,
      organizationId: claims.org_id,
      role: claims.role,
      refreshed: false,
    };
  }

  const refreshToken = getCookie(REFRESH_COOKIE);
  if (!refreshToken) return null;

  try {
    const res = await apiClient.post<SessionResponse>(
      "/api/auth/admin/refresh",
      { refreshToken },
    );
    persistSession(res.data);
    return toSession(res.data, true);
  } catch {
    clearSessionCookies();
    return null;
  }
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const createApiKeyServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1, "Key name is required") }))
  .handler(
    async ({ data }): Promise<import("~/types/api").ApiKeyWithSecret> => {
      const storeId = getCookie("wos-active-store");
      if (!storeId)
        throw new Error("No active store — complete onboarding step 1 first");
      try {
        const res = await apiClient.post<
          import("~/types/api").ApiKeyWithSecret
        >(`/api/admin/stores/${storeId}/api-keys`, data, {
          headers: { ...(await authHeader()), "X-Store-Id": storeId },
        });
        return res.data;
      } catch (err) {
        throw new Error(getErrorMessage(err));
      }
    },
  );
