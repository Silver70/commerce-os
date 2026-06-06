import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  UnderlineIcon,
} from "lucide-react";

export function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const toolbar = [
    [BoldIcon, "Bold"],
    [ItalicIcon, "Italic"],
    [UnderlineIcon, "Underline"],
    null,
    [ListIcon, "Bullet list"],
    [LinkIcon, "Link"],
  ] as const;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
        {toolbar.map((item, i) =>
          item === null ? (
            <div key={`d-${i}`} className="mx-1 h-4 w-px bg-border" />
          ) : (
            (() => {
              const Icon = item[0];
              return (
                <button
                  key={item[1]}
                  type="button"
                  title={item[1]}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })()
          ),
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        className="w-full resize-none bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        placeholder="Describe your product…"
      />
    </div>
  );
}
