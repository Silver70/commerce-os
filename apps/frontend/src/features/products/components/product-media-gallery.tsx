import * as React from "react";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { ProductMedia } from "~/types/api";

/**
 * Gallery for media already persisted on a product (detail/edit page).
 * The create flow uses `ProductMediaUploader`, which works with pending files.
 */
export function ProductMediaGallery({
  images,
  isEditing,
  onUpload,
  onDelete,
}: {
  images: ProductMedia[];
  isEditing: boolean;
  onUpload: (file: File, altText?: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => onUpload(f));
    e.target.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Media</CardTitle>
          {isEditing && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon className="h-3.5 w-3.5" />
                Upload
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
            <ImageIcon className="mr-2 h-5 w-5" />
            <span className="text-sm">No media yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted"
              >
                <img
                  src={img.url}
                  alt={img.altText ?? ""}
                  className="h-full w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onDelete(img.id)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
                {img.altText && (
                  <p className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-1.5 py-1 text-[10px] text-white/90">
                    {img.altText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
