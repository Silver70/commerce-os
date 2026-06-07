import { ALL_COUNTRIES } from "./constants";

/** Resolve an ISO country code to its display name, falling back to the code. */
export function countryName(code: string): string {
  return ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
