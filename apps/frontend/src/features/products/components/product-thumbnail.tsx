export function ProductThumbnail({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg border border-border/50 bg-muted">
      <span className="text-sm font-bold text-muted-foreground">{name[0]}</span>
    </div>
  );
}
