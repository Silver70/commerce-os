// Single source of truth for the shipping/region country list used across the
// app (onboarding shipping setup + shipping-zone admin). Previously this lived
// duplicated — and out of sync — in features/shipping/constants.ts and inline
// in the onboarding step-2 route. Codes are ISO 3166-1 alpha-2 (lowercase form
// is what `flag-icons` expects: `fi fi-<code>`).

export type Country = { code: string; name: string; region: string };

export const REGIONS = [
  "Asia",
  "Middle East",
  "Africa",
  "Europe",
  "Americas",
  "Oceania",
] as const;

export type Region = (typeof REGIONS)[number];

export const ALL_COUNTRIES: Country[] = [
  // Asia
  { code: "CN", name: "China", region: "Asia" },
  { code: "IN", name: "India", region: "Asia" },
  { code: "ID", name: "Indonesia", region: "Asia" },
  { code: "JP", name: "Japan", region: "Asia" },
  { code: "KR", name: "South Korea", region: "Asia" },
  { code: "MY", name: "Malaysia", region: "Asia" },
  { code: "MV", name: "Maldives", region: "Asia" },
  { code: "PK", name: "Pakistan", region: "Asia" },
  { code: "PH", name: "Philippines", region: "Asia" },
  { code: "SG", name: "Singapore", region: "Asia" },
  { code: "LK", name: "Sri Lanka", region: "Asia" },
  { code: "TH", name: "Thailand", region: "Asia" },
  { code: "VN", name: "Vietnam", region: "Asia" },
  // Middle East
  { code: "BH", name: "Bahrain", region: "Middle East" },
  { code: "KW", name: "Kuwait", region: "Middle East" },
  { code: "QA", name: "Qatar", region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East" },
  { code: "TR", name: "Turkey", region: "Middle East" },
  { code: "AE", name: "United Arab Emirates", region: "Middle East" },
  // Africa
  { code: "EG", name: "Egypt", region: "Africa" },
  { code: "GH", name: "Ghana", region: "Africa" },
  { code: "KE", name: "Kenya", region: "Africa" },
  { code: "MA", name: "Morocco", region: "Africa" },
  { code: "NG", name: "Nigeria", region: "Africa" },
  { code: "ZA", name: "South Africa", region: "Africa" },
  // Europe
  { code: "AT", name: "Austria", region: "Europe" },
  { code: "BE", name: "Belgium", region: "Europe" },
  { code: "HR", name: "Croatia", region: "Europe" },
  { code: "CZ", name: "Czech Republic", region: "Europe" },
  { code: "DK", name: "Denmark", region: "Europe" },
  { code: "FI", name: "Finland", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "GR", name: "Greece", region: "Europe" },
  { code: "HU", name: "Hungary", region: "Europe" },
  { code: "IE", name: "Ireland", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "NO", name: "Norway", region: "Europe" },
  { code: "PL", name: "Poland", region: "Europe" },
  { code: "PT", name: "Portugal", region: "Europe" },
  { code: "RO", name: "Romania", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "SE", name: "Sweden", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  { code: "UA", name: "Ukraine", region: "Europe" },
  { code: "GB", name: "United Kingdom", region: "Europe" },
  // Americas
  { code: "AR", name: "Argentina", region: "Americas" },
  { code: "BR", name: "Brazil", region: "Americas" },
  { code: "CA", name: "Canada", region: "Americas" },
  { code: "CL", name: "Chile", region: "Americas" },
  { code: "CO", name: "Colombia", region: "Americas" },
  { code: "MX", name: "Mexico", region: "Americas" },
  { code: "PE", name: "Peru", region: "Americas" },
  { code: "US", name: "United States", region: "Americas" },
  // Oceania
  { code: "AU", name: "Australia", region: "Oceania" },
  { code: "FJ", name: "Fiji", region: "Oceania" },
  { code: "NZ", name: "New Zealand", region: "Oceania" },
];

const NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map((c) => [c.code, c.name]),
);

/** Resolve an ISO country code to its display name, falling back to the code. */
export function countryName(code: string): string {
  return NAME_BY_CODE[code] ?? code;
}
