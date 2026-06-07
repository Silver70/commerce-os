/**
 * Read the active store id from the client-side cookie. This is the browser
 * counterpart to the server-side `adminStoreHeader` in ~/lib/active-store.
 */
export function getActiveStoreId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)wos-active-store=([^;]*)/);
  return match ? match[1] : null;
}
