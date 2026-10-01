import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { MediaUploadButton } from "@/components/admin/media/MediaUploadDialog";
import { MediaType, type Media as MediaRow } from "@/generated/prisma/client";
import { getLocalizedPath, isLocale } from "@/lib/i18n/routing";
import {
  MEDIA_LIBRARY_PAGE_SIZE,
  mediaListQueryString,
  mediaOffset,
  parseMediaListParams,
  type MediaLibraryItem,
  type RawSearchParams,
} from "@/lib/media/library";
import { listMediaPage } from "@/lib/media/service";
import { redirect } from "next/navigation";

/**
 * The media library — the admin surface over the `Media` table.
 *
 * Access is enforced by the `(admin)` layout's `requireAdminAccess()` (with
 * `proxy.ts` as the edge gate in front of it), exactly like every other section
 * page: a plain `user` never reaches this function, and the actions it calls
 * re-check the role themselves, so nothing here depends on the sidebar having
 * hidden a link.
 *
 * Server component on purpose. It reads ONE page of rows for the current
 * query, maps them to a plain DTO (Date -> ISO string) and hands them to the
 * client grid. Filtering, sorting and paging are query-string state, so they
 * are resolved here and re-resolved by the server on every change — the grid is
 * never given the whole table to filter in JavaScript.
 */

/** The kind filter as the DB enum. `all` is handled before this map is read. */
const MEDIA_TYPE_BY_FILTER: Record<"image" | "video", MediaType> = {
  image: MediaType.image,
  video: MediaType.video,
};

export default async function MediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  const listParams = parseMediaListParams(rawSearch);

  const { rows, total } = await listMediaPage({
    search: listParams.search || undefined,
    mediaType:
      listParams.type === "all"
        ? undefined
        : MEDIA_TYPE_BY_FILTER[listParams.type],
    sort: listParams.sort,
    limit: MEDIA_LIBRARY_PAGE_SIZE,
    offset: mediaOffset(listParams.page),
  });

  // A page number can outlive the rows it described — the library shrank, or
  // the URL was hand-edited. Rendering an empty grid with "no media yet" would
  // be a lie (there IS media, just not on page 7), so fall back to the first
  // page and let the URL say so.
  if (rows.length === 0 && total > 0) {
    redirect(
      getLocalizedPath(
        `/admin/media${mediaListQueryString(listParams, { page: 1 })}`,
        isLocale(locale) ? locale : "fa",
      ),
    );
  }

  const items: MediaLibraryItem[] = rows.map(toLibraryItem);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.media"
          descriptionKey="admin.section.media.description"
          actions={<MediaUploadButton />}
        />
        <MediaLibrary items={items} total={total} params={listParams} />
      </div>
    </div>
  );
}

/**
 * Row -> client DTO.
 *
 * `Date` is serializable across the RSC boundary, but ISO strings keep the
 * contract plain and make the client's formatting explicit rather than relying
 * on the framework's Date revival. `storageKey` is deliberately NOT included:
 * it is a storage implementation detail, and a client that never sees it cannot
 * be tempted to send it back.
 */
function toLibraryItem(row: MediaRow): MediaLibraryItem {
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
