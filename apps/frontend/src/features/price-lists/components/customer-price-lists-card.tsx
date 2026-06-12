import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { priceListsForCustomerQueryOptions } from "../queries";
import { formatAdjustment, formatType } from "../utils";

/** Price lists assigned directly to a customer (shown on the customer page). */
export function CustomerPriceListsCard({ customerId }: { customerId: string }) {
  const { data: lists = [] } = useQuery(
    priceListsForCustomerQueryOptions(customerId),
  );

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold">Price Lists</CardTitle>
      </CardHeader>
      <CardContent className="divide-y pt-0">
        {lists.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No price lists assigned directly to this customer.
          </p>
        ) : (
          lists.map((p) => (
            <Link
              key={p.id}
              to="/admin/price-lists/$priceListId"
              params={{ priceListId: p.id }}
              className="flex items-center justify-between py-3 transition-colors hover:text-foreground"
            >
              <span className="text-sm font-medium">{p.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {p.type === "fixed" ? formatType(p) : formatAdjustment(p)}
                <ChevronRightIcon className="h-4 w-4" />
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
