import * as React from "react";

/**
 * Product avatar for tables and lists. Shows the product's image when one is
 * available, otherwise falls back to a monogram of the product name. Also
 * falls back if the image fails to load.
 */
export function ProductThumbnail({
  name,
  imageUrl,
  altText,
}: {
  name: string;
  imageUrl?: string | null;
  altText?: string | null;
}) {
  const [failed, setFailed] = React.useState(false);

  // Reset the failure state if the image source changes (e.g. row reuse).
  React.useEffect(() => setFailed(false), [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={altText ?? name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-lg border border-border/50 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg border border-border/50 bg-muted">
      <span className="text-sm font-bold text-muted-foreground">{name[0]}</span>
    </div>
  );
}
