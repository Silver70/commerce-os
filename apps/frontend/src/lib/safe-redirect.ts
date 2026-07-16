const DEFAULT_PATH = "/admin/dashboard";

/**
 * Guards against open redirects. A `?redirect=` value is attacker-controllable,
 * so only same-origin absolute paths are honored: anything protocol-relative
 * ("//evil.com", "/\evil.com") or otherwise absolute falls back to the dashboard.
 */
export function safeRedirectPath(target?: string): string {
  if (!target || !target.startsWith("/")) return DEFAULT_PATH;
  if (target.startsWith("//") || target.startsWith("/\\")) return DEFAULT_PATH;
  return target;
}
