import * as React from "react";
import { GripVerticalIcon, ImagePlusIcon, XIcon } from "lucide-react";
import type { PendingFile } from "../types";

/**
 * Media picker for the product create flow. Works with not-yet-uploaded
 * {@link PendingFile}s held in form state; the detail page uses
 * `ProductMediaGallery` for media already persisted on a product.
 */
export function ProductMediaUploader({
  files,
  onAdd,
  onRemove,
}: {
  files: PendingFile[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    selected.forEach((f) => onAdd(f));
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />
      <div className="flex flex-wrap gap-2.5">
        {files.map((pf, i) => (
          <div
            key={pf.id}
            className="group relative h-[88px] w-[88px] overflow-hidden rounded-lg"
          >
            <img
              src={URL.createObjectURL(pf.file)}
              alt={pf.altText || pf.file.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVerticalIcon className="h-3.5 w-3.5 text-white drop-shadow" />
            </div>
            <button
              type="button"
              onClick={() => onRemove(pf.id)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <XIcon className="h-3 w-3" />
            </button>
            {i === 0 && (
              <div className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white">
                  Primary
                </span>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-600 dark:hover:bg-amber-950/10"
        >
          <ImagePlusIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Add</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/20 py-6 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
      >
        <ImagePlusIcon className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Drop images here, or click to upload
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          JPEG, PNG, WebP · Max 5 MB each
        </p>
      </button>
    </div>
  );
}
