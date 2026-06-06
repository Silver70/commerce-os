import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { ProductOption } from "~/types/api";

export function OptionsCard({ options }: { options: ProductOption[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((group) => (
          <div key={group.id} className="flex items-start gap-3">
            <span className="w-16 shrink-0 pt-0.5 text-sm text-muted-foreground">
              {group.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((v) => (
                <Badge
                  key={v.id}
                  variant="outline"
                  className="px-2 py-0.5 text-xs font-normal"
                >
                  {v.value}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
