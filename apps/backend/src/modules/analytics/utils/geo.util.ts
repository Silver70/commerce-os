import type { IncomingHttpHeaders } from 'http';

export interface ResolvedGeo {
  countryCode: string | null;
  region: string | null;
}

// Values CDNs use for "unknown / anonymized" — treat as no country.
const UNKNOWN_COUNTRY = new Set(['XX', 'T1', 'ZZ', '']);

function header(headers: IncomingHttpHeaders, name: string): string | null {
  const v = headers[name];
  const raw = Array.isArray(v) ? v[0] : v;
  return raw ? raw.trim() : null;
}

/**
 * Resolves visitor geo from a CDN edge header (D4: header-first). Supports
 * Cloudflare (`cf-ipcountry`) and Vercel (`x-vercel-ip-country[-region]`). No IP
 * database and — critically — the raw IP is never read or stored here. Returns
 * nulls when the storefront isn't behind a geo-aware edge; a GeoLite2 fallback
 * can be added later without touching callers.
 */
export function resolveGeo(headers: IncomingHttpHeaders): ResolvedGeo {
  const rawCountry =
    header(headers, 'cf-ipcountry') ?? header(headers, 'x-vercel-ip-country');
  const countryCode =
    rawCountry && !UNKNOWN_COUNTRY.has(rawCountry.toUpperCase())
      ? rawCountry.toUpperCase().slice(0, 2)
      : null;

  const rawRegion =
    header(headers, 'x-vercel-ip-country-region') ??
    header(headers, 'cf-region-code');
  const region = rawRegion ? safeDecode(rawRegion).slice(0, 128) : null;

  return { countryCode, region };
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
