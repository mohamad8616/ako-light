/**
 * Pass 13.5E — the ONE place upload limits and the direct-upload threshold live.
 *
 * Why this module exists: before this pass the 5 MB image ceiling was reachable
 * from three different modules (`image-sniff.ts`, `media/validation.ts`,
 * `next.config.ts`), and adding a video limit would have meant a fourth copy of
 * the rule. A limit that is restated in several places is a limit that will
 * disagree with itself, so every ceiling is declared here once and imported.
 *
 * CONFIGURABLE, NOT HARDCODED. The two video knobs read the environment so a
 * deployment can raise or lower them without a code change, while still having a
 * safe default. They are parsed defensively: a malformed value falls back to the
 * default rather than producing `NaN`, which would silently disable the check
 * (`size > NaN` is always false).
 *
 * PURE: no imports, no `process` access at module scope beyond the documented
 * env reads, so both the server and the browser can import it.
 */

/** The existing image ceiling — unchanged by this pass. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The video ceiling. Deliberately generous (a short brand film) but NOT
 * unlimited, and equal to the ceiling the Liara provider enforces on a
 * presigned upload (see `authorizeClientUpload` in lib/media/storage/liara.ts).
 */
const DEFAULT_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

/** Env var that overrides {@link VIDEO_MAX_BYTES}. */
export const VIDEO_MAX_BYTES_ENV = "MEDIA_VIDEO_MAX_BYTES";

/**
 * Reads a positive integer byte limit from the environment.
 *
 * Returns the fallback for anything that is not a finite, positive number, so a
 * typo degrades to the safe default instead of removing the guard.
 */
export function readByteLimit(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** The effective video ceiling for this process. */
export const VIDEO_MAX_BYTES = readByteLimit(
  typeof process === "undefined" ? undefined : process.env[VIDEO_MAX_BYTES_ENV],
  DEFAULT_VIDEO_MAX_BYTES,
);

/**
 * Above this size a file is uploaded DIRECT to the storage provider instead of
 * through a Server Action.
 *
 * The Server Action body limit is 6 MB (next.config.ts) because a server action
 * buffers the whole payload in memory before the handler runs. Anything close to
 * that should not travel through the Next server at all, so the switch happens
 * comfortably below it rather than at the cliff edge.
 */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

/** The largest file the server-action path will ever accept. */
export const SERVER_UPLOAD_MAX_BYTES = IMAGE_MAX_BYTES;

/**
 * The Liara bucket must be set to PUBLIC access in the console.
 *
 * Unlike Vercel Blob's `access` parameter, this is NOT a write-time value — the
 * S3 API has no such concept, so there is nothing left to keep in sync in code
 * and no mismatch the provider could refuse. It still matters operationally:
 * the catalogue renders the stored URLs directly with `<Image>`, and
 * `next.config.ts` whitelists the bucket's public host. A private bucket would
 * additionally need a signing/read path that does not exist here.
 */

/** Human-readable ceilings, for messages and docs. */
export const LIMITS_SUMMARY = {
  imageMaxBytes: IMAGE_MAX_BYTES,
  videoMaxBytes: VIDEO_MAX_BYTES,
  directUploadThresholdBytes: DIRECT_UPLOAD_THRESHOLD_BYTES,
} as const;
