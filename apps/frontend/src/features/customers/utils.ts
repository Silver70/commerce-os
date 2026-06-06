import type { Customer } from "~/types/api";

/** Joined first + last name, or "—" when neither is present. */
export function fullName(c: Pick<Customer, "firstName" | "lastName">): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}
