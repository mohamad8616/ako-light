"use client";

import {
  formatBytes,
  formatDate,
  formatDimensions,
  shortType,
} from "@/components/admin/media/format";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MediaLibraryItem } from "@/lib/media/library";
import Image from "next/image";

/**
 * One tile in the media grid.
 *
 * The tile is selectable when `onSelect` is supplied: the dialog lives in the
 * grid, and this component only reports the click. When no handler is given the
 * tile is inert rather than a button that does nothing.
 *
 * The click target is a TRANSPARENT BUTTON OVERLAY rather than a button wrapped
 * around the card. A `<button>` may only contain phrasing content, so a
 * `<figure>`/`<figcaption>` inside one is invalid HTML — the overlay keeps the
 * figure's semantics, gives the whole tile a single focusable element, and
 * carries a real accessible name instead of relying on the visible text.
 *
 * `next/image` rather than a bare `<img>`: the grid shows many tiles, and the
 * optimizer is what keeps the browser from pulling full-size originals just to
 * paint 200px squares. `fill` + `sizes` is the correct pairing for a responsive
 * square whose intrinsic size is unknown — `Media.width`/`height` are nullable
 * until the probing pass backfills them.
 */
export function MediaCard({
  item,
  onSelect,
}: {
  item: MediaLibraryItem;
  onSelect?: (item: MediaLibraryItem) => void;
}) {
  const { t, lang } = useLanguage();

  // Alt text is the accessibility contract; the filename is the honest last
  // resort, and it is at least specific (unlike an empty string, which would
  // make the image decorative and hide it from assistive tech entirely).
  const altText = item.alt || item.title || item.filename;
  const kindLabel =
    item.mediaType === "video"
      ? t("admin.media.kind.video")
      : t("admin.media.kind.image");
  const dimensions = formatDimensions(item.width, item.height);

  return (
    <div className="relative">
      <figure className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="bg-muted relative aspect-square overflow-hidden">
          <Image
            src={item.url}
            alt={altText}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            className="object-cover"
          />
          <Badge variant="secondary" className="absolute start-2 top-2 shadow-sm">
            {kindLabel}
          </Badge>
        </div>

        <figcaption className="space-y-1 p-2">
          <p
            className="truncate text-xs font-medium"
            title={item.title ?? item.filename}
          >
            {item.filename}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {formatBytes(item.size)}
            <span aria-hidden="true"> · </span>
            {shortType(item.mimeType)}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {dimensions ? (
              <>
                <span dir="ltr" className="tabular-nums">
                  {dimensions}
                </span>
                <span aria-hidden="true"> · </span>
              </>
            ) : null}
            {formatDate(item.createdAt, lang)}
          </p>
        </figcaption>
      </figure>

      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(item)}
          aria-label={`${t("admin.media.openDetails")}: ${item.filename}`}
          className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      ) : null}
    </div>
  );
}
