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
 * This module owns the DATABASE half of media. The storage half (Blob) and the
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
 * misleading impression of memoization. Filtering here is intentionally minimal
 * (kind + paging); the media-library search/filter UI is a later subpass.
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
