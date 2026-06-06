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
