import { getCookie } from "@tanstack/react-start/server";

export function adminStoreHeader(): Record<string, string> {
  const storeId = getCookie("wos-active-store");
  return storeId ? { "X-Store-Id": storeId } : {};
}
