import { BuildingIcon, HomeIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { CustomerAddress } from "~/types/api";

export function AddressRow({ addr }: { addr: CustomerAddress }) {
  const displayName = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {addr.isDefault ? (
          <HomeIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">
            {addr.isDefault ? "Default address" : "Address"}
          </p>
          {addr.isDefault && (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-medium text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
            >
              Default
            </Badge>
          )}
        </div>
        <address className="mt-1 not-italic space-y-0 text-xs text-muted-foreground leading-relaxed">
          {displayName && <p>{displayName}</p>}
          <p>
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ""}
          </p>
          <p>
            {addr.city}
            {addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
          </p>
          <p>{addr.countryCode}</p>
          {addr.phone && <p>{addr.phone}</p>}
        </address>
      </div>
    </div>
  );
}
