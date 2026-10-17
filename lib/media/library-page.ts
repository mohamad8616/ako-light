import { MediaType, type Media as MediaRow } from "@/generated/prisma/client";
import {
  MEDIA_LIBRARY_PAGE_SIZE,
  mediaOffset,
  type MediaKind,
  type MediaLibraryItem,
  type MediaListParams,
  type MediaSort,
} from "@/lib/media/library";
import { listMediaPage } from "@/lib/media/service";

/**
 * ONE page of the media library, mapped to the client DTO — the single read
 * both the server page (`/admin/media`) and the infinite-scroll action
 * (`loadMoreMediaAction`) go through.
 *
 * Why this is a module rather than a helper inside the page: the grid now
 * fetches its own following pages, so the page-1 read and the page-n+1 read
 * must produce IDENTICAL rows. Keeping the mapping here makes that structural
 * instead of a convention two files could drift from.
 *
 * Server-only: it imports the generated client's `MediaType` enum and the
 * repository. The dependency-free query vocabulary stays in `./library` so the
 * CLIENT grid can share constants without dragging Prisma into the bundle.
 */

/** The kind filter as the DB enum. `all` never reaches this map. */
const MEDIA_TYPE_BY_FILTER: Record<MediaKind, MediaType> = {
  image: MediaType.image,
  video: MediaType.video,
};

/**
 * Row -> client DTO.
 *
 * `Date` is serializable across the RSC boundary, but ISO strings keep the
 * contract plain and make the client's formatting explicit rather than relying
 * on the framework's Date revival. `storageKey` is deliberately NOT included:
 * it is a storage implementation detail, and a client that never sees it cannot
 * be tempted to send it back.
 */
export function toLibraryItem(row: MediaRow): MediaLibraryItem {
  return {
    id: row.id,
    filename: row.filename,
    url: row.url,
    mimeType: row.mimeType,
    size: row.size,
    width: row.width,
    height: row.height,
    mediaType: row.mediaType,
    alt: row.alt,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface MediaLibraryPage {
  items: MediaLibraryItem[];
  total: number;
  page: number;
}

/** Reads one page for the current filters, using the library's own page size. */
export async function readMediaLibraryPage(input: {
  search?: string;
  type?: MediaListParams["type"];
  sort?: MediaSort;
  page: number;
}): Promise<MediaLibraryPage> {
  const page = Math.max(1, Math.floor(input.page));
  const { rows, total } = await listMediaPage({
    search: input.search || undefined,
    mediaType:
      !input.type || input.type === "all"
        ? undefined
        : MEDIA_TYPE_BY_FILTER[input.type],
    sort: input.sort ?? "newest",
    limit: MEDIA_LIBRARY_PAGE_SIZE,
    offset: mediaOffset(page),
  });

  return { items: rows.map(toLibraryItem), total, page };
}
