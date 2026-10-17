import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { MediaUploadButton } from "@/components/admin/media/MediaUploadDialog";
import {
  mediaListQueryString,
  parseMediaListParams,
  type RawSearchParams,
} from "@/lib/media/library";
import { readMediaLibraryPage } from "@/lib/media/library-page";

/**
 * The media library — the admin surface over the `Media` table.
 *
 * Access is enforced by the `(admin)` layout's `requireAdminAccess()` (with
 * `proxy.ts` as the edge gate in front of it), exactly like every other section
 * page: a plain `user` never reaches this function, and the actions it calls
 * re-check the role themselves, so nothing here depends on the sidebar having
 * hidden a link.
 *
 * Server component on purpose. It reads ONE page of rows for the current query
 * through `readMediaLibraryPage` — the SAME read the grid's infinite scroll
 * calls for pages 2…n — and hands the plain DTO to the client grid. Filtering
 * and sorting are query-string state, so they are resolved here and re-resolved
 * by the server on every change; the grid is never given the whole table to
 * filter in JavaScript.
 */
export default async function MediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  const listParams = parseMediaListParams(rawSearch);

  // This page always renders PAGE 1 — the grid appends the following pages
  // itself (infinite scroll), so `?page=` is no longer a navigation state.
  const { items, total } = await readMediaLibraryPage({
    search: listParams.search,
    type: listParams.type,
    sort: listParams.sort,
    page: 1,
  });

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.media"
          descriptionKey="admin.section.media.description"
          actions={<MediaUploadButton />}
        />
        {/* Keyed by the FILTERS: a new query is a new grid, so the pages the
            infinite scroll accumulated for the previous one are discarded. */}
        <MediaLibrary
          key={mediaListQueryString(listParams, { page: 1 })}
          items={items}
          total={total}
          params={listParams}
        />
      </div>
    </div>
  );
}
