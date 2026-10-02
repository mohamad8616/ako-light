import { del } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";

/**
 * Server-only Vercel Blob helpers — cleanup side of the admin image upload.
 *
 * This module talks to Blob's REST API with the secret
 * `BLOB_READ_WRITE_TOKEN`, so it must NEVER be imported from a client
 * component (same rule as lib/admin/result-server.ts, which keeps its
 * server-only work out of client bundles). Only `lib/admin/actions/*` may
 * import it.
 *
 * Three properties matter for the admin:
 *   1. DELETION IS BEST-EFFORT. A blob that cannot be deleted (already gone,
 *      network hiccup, a URL that was never ours) logs and returns. Cleanup
 *      runs AFTER the database write has already succeeded, so throwing here
 *      would turn a saved record into a reported failure for no reason.
 *   2. ONLY OUR OWN URLS ARE EVER DELETED. Seeded and legacy rows still point
 *      at plain external URLs from before uploads existed; those are not ours
 *      to delete, so they are filtered out by host.
 *   3. MEDIA-OWNED OBJECTS ARE NEVER DELETED HERE (Pass 13.5C). Once an upload
 *      creates a `Media` row, the object belongs to the media library and is
 *      deleted only by `removeMedia` — from /admin/media, and only when nothing
 *      references it. Replacing a product image is "remove the relationship",
 *      not "delete the file", and a row that still exists must keep rendering.
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
 * Removes any URL that a `Media` row still owns.
 *
 * This is the guard that makes it safe for an admin upload to create a Media
 * row (Pass 13.5C). Without it, replacing a product image would sweep the old
 * object straight out from under the Media record that points at it — a
 * dangling row whose image silently 404s, with no error anywhere.
 *
 * FAILS CLOSED. If the ownership check itself fails, nothing is deleted at all:
 * an orphan object is recoverable and harmless, whereas deleting a file a live
 * Media row depends on is not.
 */
async function excludeMediaOwned(urls: readonly string[]): Promise<string[]> {
  if (urls.length === 0) return [];

  try {
    const owned = await prisma.media.findMany({
      where: { url: { in: [...urls] } },
      select: { url: true },
    });
    if (owned.length === 0) return [...urls];

    const ownedSet = new Set(owned.map((row) => row.url));
    return urls.filter((url) => !ownedSet.has(url));
  } catch (error) {
    console.warn("[blob] media-ownership check failed; skipping cleanup", error);
    return [];
  }
}

/**
 * Deletes every blob URL in `urls`; ignores anything else (and duplicates).
 *
 * Best-effort on purpose: failures are logged and swallowed so a cleanup
 * problem never fails an admin action whose persistence already succeeded.
 *
 * Media-owned URLs are filtered out first (see `excludeMediaOwned`) — this runs
 * for every catalog action through this one function, so the protection is
 * automatic for all twelve-odd call sites rather than something each action has
 * to remember.
 */
export async function deleteBlobUrls(
  urls: readonly (string | null | undefined)[],
): Promise<void> {
  // Narrowed through an explicit guard: `isBlobUrl` accepts nullable input, so
  // a bare `.filter(isBlobUrl)` would leave the array's element type unchanged.
  const candidates = [...new Set(urls)].filter(
    (url): url is string => isBlobUrl(url),
  );
  if (candidates.length === 0) return;

  const targets = await excludeMediaOwned(candidates);
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
