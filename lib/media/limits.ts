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
 * unlimited, and below Vercel Blob's own per-file cap.
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
 * Above this size a file is uploaded DIRECT to Blob instead of through a Server
 * Action.
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
 * The Blob store visibility the app writes with — shared by the SERVER write
 * (`put`) and the BROWSER write (`upload`) so the two can never disagree.
 *
 * WHY THIS IS HERE, AND WHY IT MATTERS. Vercel provisions each Blob store as
 * EITHER public or private, and it REJECTS any write whose `access` does not
 * match with a bare HTTP 400 ("Cannot use public access on a private store").
 * That mismatch previously lived in two hardcoded `"public"` strings — one in
 * the server provider, one in the browser adapter — so a store provisioned the
 * other way made EVERY upload fail while looking like an unrelated code bug.
 *
 * `"public"` is required by this app: the catalog renders stored URLs directly
 * with `<Image>` and `next.config.ts` whitelists `*.public.blob.vercel-storage.com`.
 * A private store would additionally need a signing/read path that does not
 * exist here. Keep this in sync with the store's dashboard visibility — the
 * provider turns a drift into an explicit `StorageAccessMismatchError`, not a
 * silent failure.
 *
 * Lives in this module (not the server-only provider) because the BROWSER half
 * must read it too, and `limits.ts` is the established server+browser-safe
 * constants module.
 */
export const BLOB_ACCESS = "public" as const;

/** The blob visibility modes Vercel Blob accepts. */
export type BlobAccess = "public" | "private";

/** Human-readable ceilings, for messages and docs. */
export const LIMITS_SUMMARY = {
  imageMaxBytes: IMAGE_MAX_BYTES,
  videoMaxBytes: VIDEO_MAX_BYTES,
  directUploadThresholdBytes: DIRECT_UPLOAD_THRESHOLD_BYTES,
} as const;
