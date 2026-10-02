/**
 * Pure video validation — no SDK, no server-only imports.
 *
 * Deliberately the sibling of `lib/admin/image-sniff.ts` and built the same way,
 * for the same reason: a browser-supplied `File.type` is a CLAIM. Anyone can
 * POST an executable named "clip.mp4" with `type: "video/mp4"`, so the real
 * decision is always made from the file's leading bytes.
 *
 * Only two containers are accepted, because only two are worth supporting today:
 * MP4 (what every phone and camera produces) and WebM (what browsers record).
 * Adding a third is a one-line change here, not a policy spread across the app.
 */

/** The video types the admin accepts, and the extension each is stored with. */
export const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/**
 * ISO-BMFF brands that mean "this is a video".
 *
 * `avif` / `avis` are deliberately ABSENT: those are the still-image brands of
 * the same container, and they belong to the image sniffer. Claiming them here
 * would let an AVIF be stored as a video.
 */
const MP4_VIDEO_BRANDS: ReadonlySet<string> = new Set([
  "isom",
  "iso2",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "dash",
  "M4V ",
  "MSNV",
  "3gp4",
  "3gp5",
]);

/** EBML magic — the Matroska/WebM container header. */
const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];

/** Reads `length` bytes at `offset` as ASCII (byte-safe: no TextDecoder). */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = offset; i < offset + length && i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Identifies a real video from its leading bytes, or null when the payload is
 * not one of the supported containers.
 *
 *   - MP4  : "ftyp" at 4 with a known VIDEO brand at 8 (ISO-BMFF)
 *   - WebM : EBML magic at 0, and the "webm" DocType in the opening bytes
 *
 * The WebM DocType check matters: Matroska (`.mkv`) shares the EBML header and
 * is NOT accepted, because browsers will not play it inline.
 */
export function sniffVideoType(bytes: Uint8Array): string | null {
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (MP4_VIDEO_BRANDS.has(brand)) return "video/mp4";
    return null;
  }

  if (startsWith(bytes, EBML_MAGIC)) {
    // The DocType element sits within the first few dozen bytes; a bounded
    // window keeps this a constant-time check on a large file's header.
    const header = ascii(bytes, 0, 64);
    if (header.includes("webm")) return "video/webm";
  }

  return null;
}

/** Whether `mimeType` is one of the video types this app accepts. */
export function isSupportedVideoType(mimeType: string): boolean {
  return mimeType in VIDEO_EXTENSIONS;
}
