/**
 * Media metadata reads/writes — Prisma-backed access to the `media` table.
 *
 * SERVER-ONLY: `lib/db/prisma.ts` imports the generated client, whose module
 * top level pulls node:process/node:path, so nothing here may be imported from
 * a client component (the same rule every repository follows).
 *
 * Rows are returned as the generated `Media` model type rather than mapped to a
 * lib/data interface. Unlike the catalog entities there is no static-file
 * counterpart to keep in sync, so there is nothing to map TO — a mapper would
 * only be a second, drifting copy of the schema.
 *
 * This module owns the DATABASE half of media. The storage half and the
 * coordination between the two live in lib/media/service.ts; nothing here talks
 * to a storage provider.
 */
import { cache } from "react";
import {
  MediaType,
  type Media as MediaRow,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MEDIA_LIBRARY_PAGE_SIZE, type MediaSort } from "@/lib/media/library";

export type { MediaRow };

/** Everything needed to register a freshly stored object. */
export interface CreateMediaInput {
  /** Original client filename — display/download only, never a path segment. */
  filename: string;
  /** The provider key actually used (see `StoredObject.key`). */
  storageKey: string;
  /** Public URL captured at upload time. */
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  alt?: string | null;
  title?: string | null;
  /** Defaults to `image`. */
  mediaType?: MediaType;
}

/**
 * The metadata an admin may edit AFTER upload.
 *
 * Storage-backed fields (key, url, mime, size) are deliberately absent: changing
 * them would desynchronize the row from the object in the store. An `undefined`
 * field is left untouched; `null` clears it.
 */
export interface UpdateMediaMetadataInput {
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

export interface ListMediaOptions {
  /** Restrict to one kind. */
  mediaType?: MediaType;
  /** Page size. Defaults to {@link DEFAULT_MEDIA_PAGE_SIZE}. */
  limit?: number;
  /** Rows to skip (offset paging). */
  offset?: number;
}

/** Default page size — small enough that a list stays a cheap query. */
export const DEFAULT_MEDIA_PAGE_SIZE = 50;

/**
 * One row by id.
 *
 * Wrapped in React `cache()` like every read in this layer, so several
 * components in one server render share a single query.
 */
export const getMedia = cache(async (id: string): Promise<MediaRow | null> => {
  return prisma.media.findUnique({ where: { id } });
});

/**
 * One row by its provider key.
 *
 * The key is `@unique`, which is what makes "who owns this object?" answerable
 * — the reconciliation a cleanup pass needs.
 */
export const getMediaByStorageKey = cache(
  async (storageKey: string): Promise<MediaRow | null> => {
    return prisma.media.findUnique({ where: { storageKey } });
  },
);

/** Total number of media rows. */
export const countMedia = cache(async (): Promise<number> => {
  return prisma.media.count();
});

/**
 * A page of rows, newest first.
 *
 * NOT wrapped in React `cache()`: the options object is a fresh reference on
 * every call, so `cache()` could never dedupe it — it would only add a
 * misleading impression of memoization.
 *
 * Minimal by design: this is the simple "newest N, optionally of one kind" read
 * that the catalog passes need. The media LIBRARY's search / filter / sort /
 * paging read is {@link listMediaPage} below, which also reports the total.
 */
export async function listMedia(
  options: ListMediaOptions = {},
): Promise<MediaRow[]> {
  return prisma.media.findMany({
    where: options.mediaType ? { mediaType: options.mediaType } : undefined,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? DEFAULT_MEDIA_PAGE_SIZE,
    skip: options.offset ?? 0,
  });
}

/** Filter + sort + paging for one media-LIBRARY page. */
export interface MediaListQuery {
  /** Case-insensitive match against filename, title or alt text. */
  search?: string;
  /** Restrict to one kind; omit for "all". */
  mediaType?: MediaType;
  /** Defaults to `newest`. */
  sort?: MediaSort;
  /** Page size. Defaults to {@link MEDIA_LIBRARY_PAGE_SIZE}. */
  limit?: number;
  /** Rows to skip (offset paging). */
  offset?: number;
}

/** One page of the library: the matching rows plus how many matched in total. */
export interface MediaPage {
  rows: MediaRow[];
  total: number;
}

/**
 * The `orderBy` each sort name maps to.
 *
 * A lookup table rather than a `switch`: the sort names are a closed union, so
 * the compiler fails the build if one is ever added without an order — which a
 * `switch` with a `default` would silently swallow.
 */
const MEDIA_SORT_ORDER: Record<
  MediaSort,
  Prisma.MediaOrderByWithRelationInput
> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  "name-asc": { filename: "asc" },
  "name-desc": { filename: "desc" },
  largest: { size: "desc" },
  smallest: { size: "asc" },
};

/** The `where` a library query implies: the kind filter plus the free-text search. */
function mediaListWhere(query: MediaListQuery): Prisma.MediaWhereInput {
  const where: Prisma.MediaWhereInput = {};
  if (query.mediaType) where.mediaType = query.mediaType;

  const term = query.search?.trim();
  if (term) {
    // `mode: "insensitive"` is Postgres ILIKE. The three fields are the ones an
    // admin can actually recognise a file by: the original name, the label they
    // gave it, and its accessibility text.
    where.OR = [
      { filename: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { alt: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

/**
 * One page of the media library.
 *
 * Returns the page's rows AND the total that matched, so the pager can render
 * "page 3 of 7" without a second round trip (or, worse, a client that counts
 * rows it was never sent).
 *
 * Filtering, sorting and paging all happen in Postgres: the grid receives one
 * page, never the whole table. That is the point of a server-backed library —
 * a client-side filter would have to ship every row to the browser first.
 *
 * NOT wrapped in React `cache()`: the options object is a fresh reference on
 * every call, so `cache()` could never dedupe it — the same reasoning as
 * `listMedia` above.
 */
export async function listMediaPage(
  query: MediaListQuery = {},
): Promise<MediaPage> {
  const where = mediaListWhere(query);

  // Two reads, issued together: the page itself and its total. They are
  // independent, so awaiting them sequentially would only add a round trip.
  const [rows, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: MEDIA_SORT_ORDER[query.sort ?? "newest"],
      take: query.limit ?? MEDIA_LIBRARY_PAGE_SIZE,
      skip: query.offset ?? 0,
    }),
    prisma.media.count({ where }),
  ]);

  return { rows, total };
}

/**
 * Registers a stored object. Returns the created row.
 *
 * `db` defaults to the root client but accepts a transaction client, the
 * standard seam in this layer, so a caller can commit the row atomically with
 * related writes.
 *
 * A duplicate `storageKey` is rejected by the database (`@unique`), which is
 * the last line of defence against two rows owning one object — the caller is
 * expected to treat that as an error rather than to pre-check.
 */
export async function createMedia(
  input: CreateMediaInput,
  db: Prisma.TransactionClient = prisma,
): Promise<MediaRow> {
  return db.media.create({
    data: {
      filename: input.filename,
      storageKey: input.storageKey,
      url: input.url,
      mimeType: input.mimeType,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      duration: input.duration ?? null,
      alt: input.alt ?? null,
      title: input.title ?? null,
      mediaType: input.mediaType ?? MediaType.image,
    },
  });
}

/**
 * Updates editable metadata only.
 *
 * Each key is written ONLY when the caller supplied it, so a patch of
 * `{ title }` cannot silently null out `alt`. Passing `null` explicitly clears
 * a field — that distinction is why the input uses optional-with-null rather
 * than optional alone.
 */
export async function updateMediaMetadata(
  id: string,
  input: UpdateMediaMetadataInput,
  db: Prisma.TransactionClient = prisma,
): Promise<MediaRow> {
  const data: Prisma.MediaUpdateInput = {};
  if (input.alt !== undefined) data.alt = input.alt;
  if (input.title !== undefined) data.title = input.title;
  if (input.width !== undefined) data.width = input.width;
  if (input.height !== undefined) data.height = input.height;
  if (input.duration !== undefined) data.duration = input.duration;

  return db.media.update({ where: { id }, data });
}

/**
 * Deletes the row and returns it.
 *
 * Returning the deleted row matters: it carries the `storageKey`, so the caller
 * can remove the object from the store WITHOUT a second read — and without a
 * race in which the row is already gone. Throws Prisma's P2025 when the id does
 * not exist; the service translates that into its `notFound` code.
 */
export async function deleteMedia(
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<MediaRow> {
  return db.media.delete({ where: { id } });
}

/**
 * Maps image URLs to the `Media` rows that own them (Pass 13.5C).
 *
 * WHY THIS EXISTS INSTEAD OF A FORM FIELD. Every admin image field is a plain
 * URL string, and that contract is deliberately unchanged — adding a `mediaId`
 * input to a dozen zod schemas and a dozen forms would have been a large, risky
 * change for no user-visible gain. Instead the SERVER resolves the relationship
 * from the URL that was submitted, so the database link is a real `mediaId` FK
 * while the form keeps editing a URL exactly as it always did.
 *
 * The url is only a LOOKUP KEY here, never the stored relationship.
 *
 * `Media.url` has no unique constraint, so two rows sharing one URL would
 * resolve ambiguously. Ascending `createdAt` plus last-write-wins keeps the
 * OLDEST match, which is the more stable choice. In practice URLs are unique:
 * every upload gets its own key.
 */
export async function findMediaIdsByUrl(
  urls: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(urls.filter((url): url is string => Boolean(url))),
  ];
  if (unique.length === 0) return new Map();

  const rows = await prisma.media.findMany({
    where: { url: { in: unique } },
    select: { id: true, url: true },
    orderBy: { createdAt: "asc" },
  });

  const byUrl = new Map<string, string>();
  for (const row of rows) byUrl.set(row.url, row.id);
  return byUrl;
}
