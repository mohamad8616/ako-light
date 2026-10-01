/**
 * Display formatting shared by the media library's card and detail panel.
 *
 * Extracted so the tile and the dialog can never disagree about how a size or a
 * date reads — the same file showing "2.4 MB" in the grid and "2516582 bytes"
 * in the panel would be a small but real inconsistency.
 */
import type { Locale } from "@/lib/i18n/routing";

/** Bytes as a short human string ("812 KB", "2.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** "image/jpeg" -> "JPEG" — the part of the MIME type an admin recognises. */
export function shortType(mimeType: string): string {
  const [, subtype] = mimeType.split("/");
  return (subtype ?? mimeType).toUpperCase();
}

/**
 * A short, locale-aware date.
 *
 * `fa-IR` renders the Persian calendar, which is what a Persian-first admin
 * expects; `en-GB` gives the unambiguous day-month-year order.
 */
export function formatDate(iso: string, lang: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** `1200×800`, or null when the dimensions were never probed. */
export function formatDimensions(
  width: number | null,
  height: number | null,
): string | null {
  return width && height ? `${width}×${height}` : null;
}
