/**
 * DOCUMENT sniffing — PDF and PowerPoint, the two document types the admin may
 * upload (the catalogue's downloadable cards, and the homepage catalogue CTA).
 *
 * ── Why this exists beside `pdf-sniff` ───────────────────────────────────────
 *
 * `pdf-sniff.ts` was written for exactly one file: the homepage CTA's PDF. Its
 * rules are correct and tested, and re-deriving the PDF magic rule here would
 * create a second definition of "what is a PDF" that can drift from the first.
 * So the PDF check is IMPORTED, and the only new rule in this file is the
 * PowerPoint one.
 *
 * ── The PDF rule, unchanged ─────────────────────────────────────────────────
 *
 * `%PDF-` searched within the first 1024 bytes (the specification allows that
 * much leading junk). See `pdf-sniff.ts` for why the window exists and why a
 * strict offset-0 check would reject real files.
 *
 * ── The PowerPoint rule, and why it is PPTX-only ────────────────────────────
 *
 * A `.pptx` is an OPC/ZIP container: it starts with the local-file-header magic
 * `PK\x03\x04`, and the part that makes it a PRESENTATION rather than a Word
 * file or a spreadsheet is `ppt/presentation.xml` inside the archive. Both are
 * checked, so a `.docx` (a plain ZIP with `word/document.xml`) is refused, and so
 * is a bare ZIP that merely holds a file named `ppt/presentation.xml`.
 *
 * The legacy `.ppt` binary format is deliberately NOT accepted. It is an OLE2
 * compound document whose magic (`D0 CF 11 E0 A1 B1 1A E1`) is SHARED by legacy
 * `.doc` and `.xls`, and distinguishing the three requires parsing the OLE fat
 * and directory tables — a parser this project does not have and should not grow
 * for one input. Accepting the magic alone would therefore also accept a Word
 * file renamed to `.ppt`, which is exactly the class of mistake byte sniffing
 * exists to prevent. Office has written `.pptx` since 2007; a deck in the legacy
 * format can be re-saved in two clicks.
 *
 * ── Cost of the OOXML search ────────────────────────────────────────────────
 *
 * The archive entry names are stored UNCOMPRESSED in the local file headers, so
 * they are findable in the raw bytes without inflating anything. `[Content_Types]
 * .xml` and `ppt/presentation.xml` are the first parts in the package by OPC
 * convention, so a 64 KB window at the head of the file is generous — but the
 * search still runs chunked over the WHOLE buffer, so an archive that stores
 * other parts first is still recognised and the cost stays linear and bounded.
 *
 * PURE: no I/O, no `process` — importable from the browser and the server alike.
 */
import { PDF_MIME_TYPE, sniffPdfType } from "@/lib/media/pdf-sniff";

/** The PowerPoint type this module accepts, and the extension it stores with. */
export const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/**
 * Every document type the admin may upload.
 *
 * The KEY is the authoritative MIME type (sniffed, or derived server-side from
 * the extension) and the VALUE is the extension the object is stored with.
 */
export const DOCUMENT_EXTENSIONS: Record<string, string> = {
  [PDF_MIME_TYPE]: "pdf",
  [PPTX_MIME_TYPE]: "pptx",
};

/** The document types, as a list — for `accept` and for the allow-list set. */
export const DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_EXTENSIONS);

/** The reverse map: extension (lowercase, no dot) → MIME type. */
export const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> =
  Object.fromEntries(
    Object.entries(DOCUMENT_EXTENSIONS).map(([mime, ext]) => [ext, mime]),
  );

/**
 * The hard ceiling for a document, on BOTH upload paths.
 *
 * Generous on purpose — a presentation deck is routinely 10–40 MB — but not
 * unlimited, and enforced by the provider on the wire for the direct path. The
 * two limits are separate because a file may take EITHER path, and each path
 * has its own physical constraint:
 *
 *   - {@link DOCUMENT_SERVER_MAX_BYTES} — the Server Action route.
 *     `next.config.ts` caps an action body at 6 MB and the framework buffers
 *     the whole payload in memory, so anything near that ceiling takes the
 *     direct path instead.
 *   - {@link DOCUMENT_MAX_BYTES} — the overall ceiling.
 */
export const DOCUMENT_MAX_BYTES = 60 * 1024 * 1024;

/** The ceiling for a document uploaded through a Server Action. */
export const DOCUMENT_SERVER_MAX_BYTES = 4 * 1024 * 1024;

/** How far into the file the OOXML entry names are searched. */
const OOXML_SEARCH_WINDOW = 64 * 1024;

/** The chunk size for the OOXML search — bounded memory, linear cost. */
const OOXML_CHUNK = 1024 * 1024;

/** The ZIP local-file-header magic every OOXML package starts with. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

/** The OPC content-types part. Its presence proves an OOXML package. */
const CONTENT_TYPES_PART = "[Content_Types].xml";

/** The presentation part. Its presence makes the package a PRESENTATION. */
const PRESENTATION_PART = "ppt/presentation.xml";

/** True when `bytes` starts with the ZIP local-file-header magic. */
function hasZipMagic(bytes: Uint8Array): boolean {
  if (bytes.length < ZIP_MAGIC.length) return false;
  return ZIP_MAGIC.every((byte, index) => bytes[index] === byte);
}

/**
 * Whether `needle` occurs in `bytes[start, end)`.
 *
 * Searches chunk by chunk with a `needle.length - 1` overlap so a part that
 * straddles a chunk boundary is still found, and decodes with latin1 (one byte
 * = one char), which is how raw bytes must be read — a UTF-8 decode would mangle
 * any non-ASCII byte in a binary archive.
 */
function containsAscii(
  bytes: Uint8Array,
  needle: string,
  start: number,
  end: number,
): boolean {
  const decoder = new TextDecoder("latin1");
  const overlap = needle.length - 1;
  const size = OOXML_CHUNK;

  for (let from = start; from < end; from += size - overlap) {
    const to = Math.min(from + size, end);
    const chunk = decoder.decode(bytes.subarray(from, to));
    if (chunk.includes(needle)) return true;
    if (to >= end) break;
  }
  return false;
}

/**
 * Whether the bytes are an OOXML PRESENTATION package.
 *
 * ZIP magic alone would accept any ZIP — a `.docx`, a `.xlsx`, an archive the
 * operator pointed at this field — so the OPC content-types part AND the
 * presentation part must both be present among the raw entry names.
 */
export function isPptxPackage(bytes: Uint8Array): boolean {
  if (!hasZipMagic(bytes)) return false;
  const end = Math.min(bytes.length, OOXML_SEARCH_WINDOW);
  return (
    containsAscii(bytes, CONTENT_TYPES_PART, 0, end) &&
    containsAscii(bytes, PRESENTATION_PART, 0, end)
  );
}

/**
 * The authoritative document MIME type of `bytes`, or `null` when it is neither
 * a PDF nor a PowerPoint presentation.
 *
 * Never throws, so callers branch on the value instead of guarding every call —
 * the same shape `sniffPdfType` uses. The PDF check runs FIRST: a PowerPoint
 * package must not be able to claim the PDF rule by containing `%PDF-` somewhere
 * in its first 1024 bytes.
 */
export function sniffDocumentType(bytes: Uint8Array): string | null {
  const pdf = sniffPdfType(bytes);
  if (pdf) return pdf;
  return isPptxPackage(bytes) ? PPTX_MIME_TYPE : null;
}

/** True when `mimeType` is one this module accepts. */
export function isSupportedDocumentType(mimeType: string): boolean {
  return mimeType in DOCUMENT_EXTENSIONS;
}

/** The storage extension for a sniffed MIME type, or `null` when unsupported. */
export function documentExtensionFor(mimeType: string): string | null {
  return DOCUMENT_EXTENSIONS[mimeType] ?? null;
}

/** The MIME type an extension maps to (case-insensitive), or `null`. */
export function documentMimeForExtension(extension: string): string | null {
  const lower = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return DOCUMENT_MIME_BY_EXTENSION[lower] ?? null;
}

/**
 * An extension reduced to one this module stores.
 *
 * Anything else degrades to `"bin"` rather than being interpolated into a
 * filename the browser will act on — a caller that sniffs the bytes itself
 * never reaches this branch, so it is defence in depth, not a code path.
 */
function safeDocumentExtension(extension: string): string {
  const lower = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.values(DOCUMENT_EXTENSIONS).includes(lower) ? lower : "bin";
}

/**
 * The hidden file input's `accept` value.
 *
 * Both the MIME type and the extension are listed: a browser that keys off the
 * extension (and some do, per-platform) still shows the right filter, and one
 * that keys off the MIME type does too. This is a convenience only — the server
 * decides from the bytes.
 */
export const DOCUMENT_ACCEPT = [
  PDF_MIME_TYPE,
  ".pdf",
  PPTX_MIME_TYPE,
  ".pptx",
].join(",");

/** The longest filename this module will produce. */
const DOCUMENT_NAME_MAX = 120;

/**
 * Whether a character must never reach a `Content-Disposition` header value.
 *
 * Everything from NUL through US covers every control character — and therefore
 * CR and LF, the whole header-injection class — plus DEL, the double quote that
 * would close the value, and the backslash that would escape inside it.
 *
 * A codepoint test rather than a regex character class on purpose: the class
 * would have to carry literal control characters or escape sequences in the
 * source, and a filter over code points states the same rule with neither.
 */
function isUnsafeInFilename(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    codePoint === 0x7f ||
    codePoint === 0x22 || // " — closes the quoted header value
    codePoint === 0x5c // \ — escapes inside it
  );
}

/** The extension a stored document name carries, when it has one. */
const TRAILING_EXTENSION = /\.(pptx?|pdf)$/i;

/**
 * A presentable, header-safe filename for an uploaded document.
 *
 * This value ends up in `Content-Disposition`, which is a HEADER — so it must
 * not contain a quote, a backslash, a newline or any other control character
 * (header injection), and it must not contain a path separator (a
 * `Content-Disposition` filename is a name, never a path). The stored storage
 * KEY is sanitized separately by `buildStorageKey`; this is the name the
 * operator sees in their downloads folder.
 *
 * The suffix is normalised to the SNIFFED type, so a PDF that arrived named
 * `.pptx` (or with no extension at all) downloads under the name the browser
 * will open with the right application.
 *
 * `extension` is a plain extension WITHOUT a dot ("pdf", "pptx") — the caller
 * derives it from the sniffed type with {@link documentExtensionFor}, so the
 * authoritative value decides the suffix rather than the uploaded name.
 */
export function safeDocumentFilename(name: unknown, extension: string): string {
  const raw = typeof name === "string" ? name : "";

  const base = raw
    // Take the last path segment of either separator style.
    .split(/[\\/]/)
    .pop()!
    // Strip everything the header cannot carry (see isUnsafeInFilename).
    .split("")
    .filter((character) => !isUnsafeInFilename(character.codePointAt(0) ?? 0))
    .join("")
    // Collapse runs of whitespace so the name stays one line.
    .replace(/\s+/g, " ")
    .trim();

  // The extension the file will actually be stored with — the sniffed one,
  // never the one the client claimed.
  const suffix = safeDocumentExtension(extension);

  // Drop whatever extension the client used: it is about to be replaced by the
  // authoritative one.
  const withoutSuffix = base.replace(TRAILING_EXTENSION, "").trim() || "catalogue";
  const capped =
    withoutSuffix.length > DOCUMENT_NAME_MAX
      ? withoutSuffix.slice(0, DOCUMENT_NAME_MAX).trim()
      : withoutSuffix;

  return `${capped || "catalogue"}.${suffix}`;
}
