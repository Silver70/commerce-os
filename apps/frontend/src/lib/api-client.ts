import axios from "redaxios";
import { getCookie } from "@tanstack/react-start/server";

type ReqConfig = { headers?: Record<string, string> };
type ApiResponse<T> = { data: T; status: number; headers: Headers };

// No default Content-Type header: redaxios already sets `application/json`
// when it stringifies an object body, and forcing that header onto a FormData
// body would suppress the multipart boundary fetch needs to generate — which
// breaks file uploads (the backend can't parse the body as multipart).
const baseClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
});

// Reads the httpOnly access-token cookie set by server/auth.ts. Refreshing is
// handled once per navigation in getAdminSessionServerFn (route beforeLoad), so
// by the time server fns call this the cookie is fresh.
export async function authHeader(): Promise<Record<string, string>> {
  const accessToken = getCookie("admin-access");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const apiClient = {
  get: <T>(url: string, config: ReqConfig = {}) =>
    baseClient.get<T>(url, config) as Promise<ApiResponse<T>>,
  delete: <T>(url: string, config: ReqConfig = {}) =>
    baseClient.delete<T>(url, config) as Promise<ApiResponse<T>>,
  post: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    baseClient.post<T>(url, body, config) as Promise<ApiResponse<T>>,
  patch: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    baseClient.patch<T>(url, body, config) as Promise<ApiResponse<T>>,
  put: <T>(url: string, body?: unknown, config: ReqConfig = {}) =>
    baseClient.put<T>(url, body, config) as Promise<ApiResponse<T>>,
};
