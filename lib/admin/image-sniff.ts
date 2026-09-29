/**
 * Pure image validation for admin uploads — no SDK, no server-only imports.
 *
 * Split out of lib/admin/actions/upload.ts so the security-critical part of the
 * upload (deciding whether a payload is REALLY an image) is testable on its own
 * and cannot be accidentally coupled to request/server machinery.
 *
 * A browser-supplied `File.type` is a claim, not a fact: anyone can POST a
 * script named "cat.png" with `type: "image/png"`. So the real decision is
 * always made from the file's leading bytes.
 */

/** Upload ceiling, in bytes. Generous for photography, below DoS scale. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The image types the admin accepts, and the extension each is stored with. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

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
 * Identifies a real image from its leading bytes, or null when the payload is
 * not one of the supported formats.
 *
 * Container formats are checked as structured signatures, not just a prefix:
 *   - JPEG  : FF D8 FF
 *   - PNG   : 89 50 4E 47 0D 0A 1A 0A
 *   - WebP  : "RIFF" at 0 and "WEBP" at 8
 *   - AVIF  : "ftyp" at 4 with an "avif"/"avis" brand at 8 (ISO-BMFF)
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/** Reduces an arbitrary client file name to a safe pathname segment. */
export function safeBaseName(name: string): string {
  const withoutDirs = name.split(/[\\/]/).pop() ?? "";
  const cleaned = withoutDirs
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return cleaned.length > 0 ? cleaned : "image";
}
