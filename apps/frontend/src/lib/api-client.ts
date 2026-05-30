import axios from "redaxios";
import { setResponseHeader } from "@tanstack/react-start/server";

type ReqConfig = { headers?: Record<string, string> };
type ApiResponse<T> = { data: T; status: number; headers: Headers };

const baseClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Replace (or append) the wos-session pair inside a Cookie header string.
function swapSessionCookie(cookieHeader: string, newSessionPair: string): string {
  const parts = cookieHeader
    .split(/;\s*/)
    .filter((p) => p && !p.startsWith("wos-session="));
  parts.push(newSessionPair);
  return parts.join("; ");
}

// Exchange the wos-refresh cookie for a fresh access token. Forwards the
// rotated Set-Cookie values to the browser and returns the new wos-session
// pair (e.g. "wos-session=abc") for immediate reuse, or null if refresh fails.
async function tryRefresh(incomingCookie: string): Promise<string | null> {
  try {
    const res = await baseClient.post(
      "/api/auth/refresh",
      {},
      { headers: { cookie: incomingCookie } },
    );
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      setResponseHeader("set-cookie", setCookies);
    }
    const sessionStr = setCookies.find((c) => c.startsWith("wos-session="));
    return sessionStr?.split(";")[0] ?? null;
  } catch {
    return null;
  }
}

function isUnauthorized(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: number }).status === 401
  );
}

// Runs a request and, on a 401 where we have a session cookie, transparently
// refreshes the token once and retries. All admin server functions go through
// this, so an expired access token self-heals without bouncing the user.
async function withRefresh<T>(
  run: (config: ReqConfig) => Promise<ApiResponse<T>>,
  config: ReqConfig,
): Promise<ApiResponse<T>> {
  try {
    return await run(config);
  } catch (err) {
    const cookie = config.headers?.cookie;
    if (isUnauthorized(err) && cookie) {
      const newSession = await tryRefresh(cookie);
      if (newSession) {
        const retryConfig: ReqConfig = {
          ...config,
          headers: {
            ...config.headers,
            cookie: swapSessionCookie(cookie, newSession),
          },
        };
        return run(retryConfig);
      }
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(url: string, config: ReqConfig = {}) =>
    withRefresh<T>((c) => baseClient.get<T>(url, c), config),
  delete: <T>(url: string, config: ReqConfig = {}) =>
    withRefresh<T>((c) => baseClient.delete<T>(url, c), config),
  post: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    withRefresh<T>((c) => baseClient.post<T>(url, body, c), config),
  patch: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    withRefresh<T>((c) => baseClient.patch<T>(url, body, c), config),
  put: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    withRefresh<T>((c) => baseClient.put<T>(url, body, c), config),
};
