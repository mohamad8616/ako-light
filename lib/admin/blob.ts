import { del } from "@vercel/blob";

/**
 * Server-only Vercel Blob helpers — cleanup side of the admin image upload.
 *
 * This module talks to Blob's REST API with the secret
 * `BLOB_READ_WRITE_TOKEN`, so it must NEVER be imported from a client
 * component (same rule as lib/admin/result-server.ts, which keeps its
 * server-only work out of client bundles). Only `lib/admin/actions/*` may
 * import it.
 *
 * Two properties matter for the admin:
 *   1. DELETION IS BEST-EFFORT. A blob that cannot be deleted (already gone,
 *      network hiccup, a URL that was never ours) logs and returns. Cleanup
 *      runs AFTER the database write has already succeeded, so throwing here
 *      would turn a saved record into a reported failure for no reason.
 *   2. ONLY OUR OWN URLS ARE EVER DELETED. Seeded and legacy rows still point
 *      at plain external URLs from before uploads existed; those are not ours
 *      to delete, so they are filtered out by host.
 */

/**
 * Every Vercel Blob public URL is served from `*.blob.vercel-storage.com`
 * (store subdomain for private, `*.public.blob.vercel-storage.com` for
 * public). Matching on the suffix rather than one hard-coded host keeps
 * both, and any future store subdomain, covered.
 */
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

/**
 * True when `url` is a Vercel Blob URL — i.e. one this app can safely delete.
 *
 * Unparseable values (empty strings, relative paths, the "#" placeholders some
 * link fields allow) are simply not blob URLs, so they return false instead of
 * throwing.
 */
export function isBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    return hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * The URLs that were dropped by an edit: every non-empty entry of `before`
 * that is no longer present in `after`.
 *
 * Order-insensitive and de-duplicated — a gallery row that moved position is
 * still present, so it must not be deleted.
 */
export function removedUrls(
  before: readonly (string | null | undefined)[],
  after: readonly (string | null | undefined)[],
): string[] {
  const kept = new Set(after.filter((url): url is string => Boolean(url)));
  const dropped = new Set(
    before.filter((url): url is string => Boolean(url)),
  );
  return [...dropped].filter((url) => !kept.has(url));
}

/**
 * Deletes every blob URL in `urls`; ignores anything else (and duplicates).
 *
 * Best-effort on purpose: failures are logged and swallowed so a cleanup
 * problem never fails an admin action whose persistence already succeeded.
 */
export async function deleteBlobUrls(
  urls: readonly (string | null | undefined)[],
): Promise<void> {
  // Narrowed through an explicit guard: `isBlobUrl` accepts nullable input, so
  // a bare `.filter(isBlobUrl)` would leave the array's element type unchanged.
  const targets = [...new Set(urls)].filter(
    (url): url is string => isBlobUrl(url),
  );
  if (targets.length === 0) return;

  try {
    await del(targets);
  } catch (error) {
    // Blob rejects the whole batch if any url is unknown/missing. The
    // database no longer references these files either way, so an orphan is
    // preferable to surfacing an error for a save that did succeed.
    console.warn("[blob] cleanup failed for", targets, error);
  }
}
