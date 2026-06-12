import type { CustomerAddress } from "~/types/api";
import type { ShippingAddress } from "./types";

export const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  firstName: "",
  lastName: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "US",
  phone: "",
};

export function customerAddressToShipping(a: CustomerAddress): ShippingAddress {
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company ?? "",
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state ?? "",
    postalCode: a.postalCode,
    countryCode: a.countryCode,
    phone: a.phone ?? "",
  };
}

/** One-line summary of an address for read-only display. */
export function formatShippingAddress(a: ShippingAddress): string {
  return [a.line1, a.line2, a.city, a.state, a.postalCode, a.countryCode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

// Helpers for rendering the order timeline on the detail page.

export function timelineDotClass(eventType: string | undefined): string {
  if (!eventType) return "bg-blue-500";
  if (eventType.includes("note")) return "bg-muted-foreground/50";
  if (eventType.includes("shipment")) return "bg-violet-500";
  if (
    eventType.includes("payment") ||
    eventType.includes("placed") ||
    eventType.includes("created") ||
    eventType.includes("manually")
  )
    return "bg-emerald-500";
  return "bg-blue-500";
}

export function timelineTitle(eventType: string | undefined): string {
  if (!eventType) return "Event";
  const titles: Record<string, string> = {
    status_changed: "Status changed",
    note_added: "Note added",
    payment_received: "Payment received",
    refund_issued: "Refund issued",
    shipment_created: "Shipment created",
    manually_created: "Order created manually",
  };
  return (
    titles[eventType] ??
    eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
