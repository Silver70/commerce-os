import { cn } from "~/lib/utils";

// Renders a country flag as a crisp SVG via `flag-icons` (see app.css import).
// Consistent across every OS — unlike emoji flags, which don't render on
// Windows. `code` is an ISO 3166-1 alpha-2 code (case-insensitive).
export function Flag({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "fi shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]",
        `fi-${code.toLowerCase()}`,
        className,
      )}
      // flag-icons sizes via font-size / aspect-ratio; default to a 4:3 chip.
      style={{ width: "1.333em", height: "1em" }}
      aria-hidden="true"
    />
  );
}
