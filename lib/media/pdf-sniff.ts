/**
 * PDF sniffing — the same shape as `image-sniff` / `video-sniff`, for the one
 * non-media file this app stores: the catalogue's downloadable PDF.
 *
 * WHY BYTES AND NOT THE DECLARED TYPE
 *
 * A `File.type` is a claim made by the client. It is a fine first filter but it
 * is not evidence, so the authoritative type is read off the bytes here — the
 * same rule the image and video validators follow.
 *
 * WHY THE HEADER IS SEARCHED, NOT JUST PREFIX-CHECKED
 *
 * The PDF specification allows up to 1024 bytes of leading junk before the
 * `%PDF-` marker (a quirk inherited from PostScript). A strict offset-0 check
 * would reject real, valid PDFs produced by some tools, so the marker is looked
 * for within that window — and the window is the ONLY place it counts. A file
 * that merely CONTAINS the string further in is not a PDF.
 *
 * PURE: no I/O, no imports — importable from the browser and the server alike.
 */

/** The only MIME type this module recognises. */
export const PDF_MIME_TYPE = "application/pdf";

/** The type this module accepts, and the extension it is stored with. */
export const PDF_EXTENSIONS: Record<string, string> = {
  [PDF_MIME_TYPE]: "pdf",
};

/**
 * The upload ceiling for a PDF.
 *
 * Deliberately the SAME 5 MB as the image ceiling: a PDF travels through a
 * Server Action, and `next.config.ts` caps an action body at 6 MB, so a larger
 * file would be truncated by the framework before any validator saw it. Raising
 * this means routing PDFs through the presigned direct-upload path (the one
 * video already uses) instead — not simply editing this number.
 */
export const PDF_MAX_BYTES = 5 * 1024 * 1024;

/** How far into the file the `%PDF-` marker may legally appear. */
const PDF_HEADER_WINDOW = 1024;

/** The marker every PDF starts with. */
const PDF_MAGIC = "%PDF-";

/** Reads the bytes as Latin-1 — byte-safe, no TextDecoder, no allocation. */
function ascii(bytes: Uint8Array, from: number, to: number): string {
  let out = "";
  for (let i = from; i < to && i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * The PDF MIME type when `bytes` really are a PDF, otherwise `null`.
 *
 * Returns `null` (never throws) for anything unusable — empty input, a short
 * buffer, a non-PDF — so callers branch on the value instead of guarding every
 * call site.
 */
export function sniffPdfType(bytes: Uint8Array): string | null {
  if (bytes.length < PDF_MAGIC.length) return null;

  const head = ascii(bytes, 0, Math.min(PDF_HEADER_WINDOW, bytes.length));
  return head.includes(PDF_MAGIC) ? PDF_MIME_TYPE : null;
}

/** True when `mimeType` is the one type this module accepts. */
export function isSupportedPdfType(mimeType: string): boolean {
  return mimeType === PDF_MIME_TYPE;
}

/** The longest filename this module will produce. */
const PDF_NAME_MAX = 120;

/**
 * A presentable, header-safe filename for an uploaded PDF.
 *
 * This value ends up in `Content-Disposition`, which is a HEADER — so it must
 * not contain a quote, a backslash, a newline or any other control character
 * (header injection), and it must not contain a path separator (a
 * `Content-Disposition` filename is a name, never a path). The stored storage
 * KEY is sanitized separately by `buildStorageKey`; this is the name the
 * operator sees in their downloads folder.
 *
 * The `.pdf` suffix is guaranteed, because the browser uses it to decide what
 * to do with the file.
 */
export function safePdfFilename(name: unknown): string {
  const raw = typeof name === "string" ? name : "";

  const base = raw
    // Take the last path segment of either separator style.
    .split(/[\\/]/)
    .pop()!
    // Drop control characters (including \r and \n) and the characters that
    // would break a quoted header value.
    .replace(/[\u0000-\u001f\u007f"\\]/g, "")
    // Collapse runs of whitespace so the name stays one line.
    .replace(/\s+/g, " ")
    .trim();

  // A name that sanitized away to nothing gets a neutral fallback rather than
  // an empty header value.
  const withoutSuffix = base.replace(/\.pdf$/i, "").trim() || "catalogue";
  const capped =
    withoutSuffix.length > PDF_NAME_MAX
      ? withoutSuffix.slice(0, PDF_NAME_MAX).trim()
      : withoutSuffix;

  return `${capped || "catalogue"}.pdf`;
}
