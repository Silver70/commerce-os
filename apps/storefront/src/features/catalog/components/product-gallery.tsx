import * as React from "react";
import { ImageOff } from "lucide-react";
import type { ProductMediaItem } from "~/types/api";
import { cn } from "~/lib/utils";
import { sortMedia } from "../utils";

/** Product image gallery: a large active image plus a thumbnail strip. */
export function ProductGallery({
  media,
  alt,
}: {
  media: ProductMediaItem[];
  alt: string;
}) {
  const images = React.useMemo(() => sortMedia(media), [media]);
  const [active, setActive] = React.useState(0);

  const current = images[active];

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {current ? (
          <img
            src={current.url}
            alt={current.altText ?? alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-10" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "aspect-square overflow-hidden rounded-lg bg-muted ring-1 transition-all",
                i === active
                  ? "ring-2 ring-foreground"
                  : "ring-border hover:ring-foreground/40",
              )}
            >
              <img
                src={image.url}
                alt={image.altText ?? `${alt} thumbnail ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
