import * as React from "react";

import { cn } from "~/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Optional trailing action (e.g. a "View all" link). */
  action?: React.ReactNode;
  className?: string;
}

/** Heading + optional supporting copy and trailing action, used above grids. */
export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
