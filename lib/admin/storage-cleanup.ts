import { prisma } from "@/lib/db/prisma";
import { storageProvider } from "@/lib/media/storage";
import { readLiaraConfig } from "@/lib/media/storage/liara-config";
import { MEDIA_KEY_PREFIX } from "@/lib/media/validation";

/**
 * Server-only storage cleanup for admin image edits.
 *
 * THIS MODULE USED TO TALK TO VERCEL BLOB DIRECTLY, and that was a silent bug
 * once the app moved to Liara: it deleted through `del()` from `@vercel/blob`
 * and only ever matched URLs ending in `.blob.vercel-storage.com`. Every Liara
 * URL therefore failed its "is this ours?" check, so replacing a catalog image
 * deleted NOTHING and orphaned objects accumulated with no error anywhere.
 *
 * Deletion now goes through the SAME provider every upload uses, and ownership
 * is decided by the configured endpoint + bucket rather than by a hardcoded
 * vendor hostname.
 *
 * Three properties matter for the admin:
 *   1. DELETION IS BEST-EFFORT. An object that cannot be deleted (already gone,
 *      network hiccup, a URL that was never ours) logs and returns. Cleanup runs
 *      AFTER the database write has already succeeded, so throwing here would
 *      turn a saved record into a reported failure for no reason.
 *   2. ONLY OUR OWN OBJECTS ARE EVER DELETED. Seeded and legacy rows still point
 *      at plain external URLs from before uploads existed; those are not ours to
 *      delete, so they are filtered out by host AND by the `media/` key prefix.
 *   3. MEDIA-OWNED OBJECTS ARE NEVER DELETED HERE. Once an upload creates a
 *      `Media` row, the object belongs to the media library and is deleted only
 *      by `removeMedia` — from /admin/media, and only when nothing references
 *      it. Replacing a product image is "remove the relationship", not "delete
 *      the file", and a row that still exists must keep rendering.
 */

/**
 * The object key for a stored URL, or `null` when the URL is not one of ours.
 *
 * Handles BOTH shapes Liara serves an object from — the bucket subdomain
 * (`<bucket>.<endpoint-host>/<key>`) and path style
 * (`<endpoint-host>/<bucket>/<key>`) — because both are valid and a row written
 * by an older build may use either.
 *
 * Unparseable values (empty strings, relative paths, the "#" placeholders some
 * link fields allow) and anything outside our bucket simply return `null`
 * instead of throwing, so this is safe to use as a filter.
 */
export function storageKeyFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  // An unconfigured provider means nothing is ours to delete.
  let endpoint: string;
  let bucket: string;
  try {
    ({ endpoint, bucket } = readLiaraConfig());
  } catch {
    return null;
  }

  const endpointHost = new URL(endpoint).hostname.toLowerCase();
  const host = parsed.hostname.toLowerCase();

  let rawKey: string | null = null;
  if (host === `${bucket}.${endpointHost}`.toLowerCase()) {
    rawKey = parsed.pathname.replace(/^\//, "");
  } else if (host === endpointHost) {
    const prefix = `/${bucket}/`;
    if (parsed.pathname.startsWith(prefix)) {
      rawKey = parsed.pathname.slice(prefix.length);
    }
  }
  if (!rawKey) return null;

  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    // A malformed escape sequence is not a key we wrote; refuse rather than
    // guess at a different object.
    return null;
  }

  // The app only ever writes under `media/`. Requiring the prefix means a URL
  // that happens to point at our bucket but is NOT app-managed content can
  // never be deleted by an admin form edit.
  return key.startsWith(`${MEDIA_KEY_PREFIX}/`) ? key : null;
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
 * Removes any key that a `Media` row still owns.
 *
 * This is the guard that makes it safe for an admin upload to create a Media
 * row (Pass 13.5C). Without it, replacing a product image would sweep the old
 * object straight out from under the Media record that points at it — a
 * dangling row whose image silently 404s, with no error anywhere.
 *
 * Matched on `storageKey` rather than on the URL: the key is what identifies
 * the object, and it survives the public-URL shape changing.
 *
 * FAILS CLOSED. If the ownership check itself fails, nothing is deleted at all:
 * an orphan object is recoverable and harmless, whereas deleting a file a live
 * Media row depends on is not.
 */
async function excludeMediaOwned(keys: readonly string[]): Promise<string[]> {
  if (keys.length === 0) return [];

  try {
    const owned = await prisma.media.findMany({
      where: { storageKey: { in: [...keys] } },
      select: { storageKey: true },
    });
    if (owned.length === 0) return [...keys];

    const ownedSet = new Set(owned.map((row) => row.storageKey));
    return keys.filter((key) => !ownedSet.has(key));
  } catch (error) {
    console.warn(
      "[media] media-ownership check failed; skipping cleanup",
      error,
    );
    return [];
  }
}

/**
 * Deletes every stored object behind `urls`; ignores anything that is not ours
 * (and duplicates).
 *
 * Best-effort on purpose: failures are logged and swallowed so a cleanup
 * problem never fails an admin action whose persistence already succeeded.
 *
 * Media-owned keys are filtered out first (see `excludeMediaOwned`) — this runs
 * for every catalog action through this one function, so the protection is
 * automatic for all the call sites rather than something each action has to
 * remember.
 */
export async function deleteStorageUrls(
  urls: readonly (string | null | undefined)[],
): Promise<void> {
  const keys = [
    ...new Set(
      urls
        .map((url) => storageKeyFromUrl(url))
        .filter((key): key is string => key !== null),
    ),
  ];
  if (keys.length === 0) return;

  const targets = await excludeMediaOwned(keys);
  if (targets.length === 0) return;

  try {
    await storageProvider.delete(targets);
  } catch (error) {
    // The database no longer references these objects either way, so an orphan
    // is preferable to surfacing an error for a save that did succeed.
    console.warn("[media] cleanup failed for", targets, error);
  }
}
