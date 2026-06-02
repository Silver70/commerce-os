import axios from "redaxios";
import { getAuth } from "@workos/authkit-tanstack-react-start";
import type { UserInfo } from "@workos/authkit-tanstack-react-start";

type ReqConfig = { headers?: Record<string, string> };
type ApiResponse<T> = { data: T; status: number; headers: Headers };

const baseClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { "Content-Type": "application/json" },
});

export async function authHeader(): Promise<Record<string, string>> {
  const auth = await getAuth();
  if (!auth.user) return {};
  const { accessToken } = auth as UserInfo;
  return { Authorization: `Bearer ${accessToken}` };
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
