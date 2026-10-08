/**
 * Reusable media validation and safe key generation.
 *
 * The security-critical rules already live in `lib/admin/image-sniff.ts` (pure,
 * no SDK, no server-only imports) and are NOT duplicated here — this module
 * composes them into the shape the media service needs. That keeps ONE
 * definition of "what is a real image" for both the legacy admin upload action
 * and the new media foundation, so the two can never drift apart.
 *
 * The rule that matters: a browser-supplied `File.type` is a CLAIM. The
 * authoritative decision is always made from the file's leading bytes.
 */
import {
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  safeBaseName,
  sniffImageType,
} from "@/lib/admin/image-sniff";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/limits";
import {
  VIDEO_EXTENSIONS,
  isSupportedVideoType,
  sniffVideoType,
} from "@/lib/media/video-sniff";

export { MAX_UPLOAD_BYTES, IMAGE_MAX_BYTES, VIDEO_MAX_BYTES };

/**
 * Why a candidate upload was rejected — 1:1 with the admin error dictionary.
 *
 * `unsupportedType` exists because `notImage` would be a lie for a rejected
 * video: the message it renders is "not a supported image", and telling an admin
 * that about their `.mov` file sends them looking for the wrong problem.
 */
export type MediaValidationCode =
  | "required"
  | "tooLarge"
  | "notImage"
  | "unsupportedType";

/** The two kinds of asset the library stores. Mirrors the `MediaType` enum. */
export type MediaKind = "image" | "video";

/** A file that passed every check, described in the terms the service needs. */
export interface ValidatedImage {
  /** The SNIFFED type — authoritative, never the client's declared value. */
  mimeType: string;
  /** The extension this type is stored with (from the shared allow-list). */
  extension: string;
  /** Size in bytes. */
  size: number;
  /** Sanitized file name WITHOUT its extension, safe to embed in a key. */
  baseName: string;
}

export type ImageValidationResult =
  | { ok: true; value: ValidatedImage }
  | { ok: false; code: MediaValidationCode };

/** A validated image or video, described in the terms the service needs. */
export interface ValidatedMedia extends ValidatedImage {
  /** Which kind was detected — this is what the `Media` row is created with. */
  mediaType: MediaKind;
}

export type MediaValidationResult =
  | { ok: true; value: ValidatedMedia }
  | { ok: false; code: MediaValidationCode };

/**
 * Every extension the storage-key builder may emit: images AND videos.
 *
 * The two allow-lists stay separate (they are validated by different sniffers),
 * but a key is just a pathname, so one union is enough to keep `safeExtension`
 * from degrading a legitimate `.mp4` to `.bin`.
 */
const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  ...Object.values(IMAGE_EXTENSIONS),
  ...Object.values(VIDEO_EXTENSIONS),
]);

/** A trailing media extension on an already-sanitized base name. */
const MEDIA_EXTENSION_SUFFIX = /\.(jpe?g|png|webp|avif|mp4|webm)$/;

/**
 * Validates an image upload against the shared rules, in the same order the
 * legacy action used (cheap checks first, byte sniffing last).
 *
 * `declaredMimeType` is only ever a first, cheap filter: a caller that lies
 * about the type still has to pass `sniffImageType`.
 */
export function validateImageUpload(input: {
  filename: string;
  declaredMimeType: string;
  bytes: ArrayBuffer;
}): ImageValidationResult {
  const size = input.bytes.byteLength;
  if (size === 0) return { ok: false, code: "required" };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, code: "tooLarge" };

  // Cheap filter: a declared type we do not handle is rejected without reading
  // the bytes. This is NOT the security boundary — the sniff below is.
  if (!(input.declaredMimeType in IMAGE_EXTENSIONS)) {
    return { ok: false, code: "notImage" };
  }

  const sniffed = sniffImageType(new Uint8Array(input.bytes));
  if (!sniffed || !(sniffed in IMAGE_EXTENSIONS)) {
    return { ok: false, code: "notImage" };
  }

  return {
    ok: true,
    value: {
      mimeType: sniffed,
      extension: IMAGE_EXTENSIONS[sniffed],
      size,
      baseName: stripImageExtension(safeBaseName(input.filename)),
    },
  };
}

/**
 * Validates an image OR video upload and reports which kind it is.
 *
 * The image path is tried FIRST and unchanged, so an AVIF (which shares the
 * ISO-BMFF `ftyp` container with MP4) can never be claimed as a video. The
 * declared type is only ever a cheap first filter on either branch — the bytes
 * decide.
 *
 * `size` is taken from the byte length, never from a client-supplied number, so
 * a caller cannot understate a file's size to slip past the ceiling.
 */
export function validateMediaUpload(input: {
  filename: string;
  declaredMimeType: string;
  bytes: ArrayBuffer;
}): MediaValidationResult {
  const size = input.bytes.byteLength;
  if (size === 0) return { ok: false, code: "required" };

  // --- Image branch: the existing, unchanged rules. ---
  if (input.declaredMimeType in IMAGE_EXTENSIONS) {
    if (size > IMAGE_MAX_BYTES) return { ok: false, code: "tooLarge" };

    const sniffed = sniffImageType(new Uint8Array(input.bytes));
    if (!sniffed || !(sniffed in IMAGE_EXTENSIONS)) {
      return { ok: false, code: "notImage" };
    }

    return {
      ok: true,
      value: {
        mimeType: sniffed,
        extension: IMAGE_EXTENSIONS[sniffed],
        size,
        baseName: stripImageExtension(safeBaseName(input.filename)),
        mediaType: "image",
      },
    };
  }

  // --- Video branch. ---
  if (isSupportedVideoType(input.declaredMimeType)) {
    if (size > VIDEO_MAX_BYTES) return { ok: false, code: "tooLarge" };

    const sniffed = sniffVideoType(new Uint8Array(input.bytes));
    if (!sniffed || !(sniffed in VIDEO_EXTENSIONS)) {
      // A file claiming to be a video whose bytes are not one. `unsupportedType`
      // rather than `notImage`: the admin uploaded a video, and the useful
      // message is "this type is not supported", not "this is not an image".
      return { ok: false, code: "unsupportedType" };
    }

    return {
      ok: true,
      value: {
        mimeType: sniffed,
        extension: VIDEO_EXTENSIONS[sniffed],
        size,
        baseName: stripImageExtension(safeBaseName(input.filename)),
        mediaType: "video",
      },
    };
  }

  // Anything else (a `.mov`, a PDF, an executable) is refused on the declared
  // type alone — no need to read the bytes to say "we do not accept this".
  return { ok: false, code: "unsupportedType" };
}

/** Drops a trailing media extension from an already-sanitized base name. */
function stripImageExtension(name: string): string {
  const stripped = name.replace(MEDIA_EXTENSION_SUFFIX, "");
  // `"photo.jpg"` -> `"photo"`, but a bare `".jpg"`-style name must not become
  // an empty segment — fall back to the sniffer's own neutral default.
  return stripped.length > 0 ? stripped : "image";
}

/**
 * Storage keys are grouped per entity ("products", "designers", …) so the store
 * stays navigable. The value crosses a client boundary, so it is matched
 * against a strict slug pattern and otherwise falls back to a neutral folder —
 * it is NEVER interpolated raw into a pathname.
 */
const FOLDER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Neutral folder for a group that is missing or not a plain slug. */
export const DEFAULT_MEDIA_FOLDER = "uploads";

/**
 * Top-level key prefix for everything this foundation owns.
 *
 * Distinct from the legacy `admin/` prefix used by
 * lib/admin/actions/upload.ts, so objects created by the media service are
 * identifiable in the store and the two generations can coexist while the
 * catalog is migrated.
 */
export const MEDIA_KEY_PREFIX = "media";

/** A client-supplied folder reduced to a safe pathname segment. */
export function safeFolder(folder: unknown): string {
  return typeof folder === "string" && FOLDER_PATTERN.test(folder)
    ? folder
    : DEFAULT_MEDIA_FOLDER;
}

/** An extension reduced to one of the allowed image extensions. */
function safeExtension(extension: string): string {
  const lower = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALLOWED_EXTENSIONS.has(lower) ? lower : "bin";
}

/**
 * Builds a safe, collision-resistant storage key:
 *
 *     media/<folder>/<timestamp>-<base>.<ext>
 *
 * Every segment is sanitized HERE, not merely by the caller, so the function is
 * safe even if it is reached with untrusted input: the folder is slug-matched,
 * the base name goes back through the same sanitizer the upload path uses, and
 * the extension is restricted to the shared allow-list. The timestamp keeps
 * keys roughly chronological in the store listing; the provider's random suffix
 * (see `addRandomSuffix`) is what actually prevents two simultaneous uploads of
 * the same name from colliding.
 *
 * `now` is injectable so a test can pin the timestamp deterministically.
 */
export function buildStorageKey(input: {
  folder?: unknown;
  baseName: string;
  extension: string;
  now?: number;
}): string {
  const group = safeFolder(input.folder);
  const base = stripImageExtension(safeBaseName(input.baseName));
  const extension = safeExtension(input.extension);
  const stamp = input.now ?? Date.now();
  return `${MEDIA_KEY_PREFIX}/${group}/${stamp}-${base}.${extension}`;
}
