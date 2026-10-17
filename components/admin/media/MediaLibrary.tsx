"use client";

import { MediaCard } from "@/components/admin/media/MediaCard";
import { MediaDetailsDialog } from "@/components/admin/media/MediaDetailsDialog";
import { MediaUploadButton } from "@/components/admin/media/MediaUploadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadMoreMediaAction } from "@/lib/admin/actions/media";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  MEDIA_SORTS,
  MEDIA_TYPE_FILTERS,
  hasMediaFilters,
  mediaListQueryString,
  type MediaLibraryItem,
  type MediaListParams,
  type MediaSort,
  type MediaTypeFilter,
} from "@/lib/media/library";
import { cn } from "@/lib/utils";
import { ImageOff, Loader2, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import * as React from "react";

/** Sort name -> dictionary key. Explicit so a rename cannot silently 404 a label. */
const SORT_LABEL_KEY: Record<MediaSort, string> = {
  newest: "admin.media.sort.newest",
  oldest: "admin.media.sort.oldest",
  "name-asc": "admin.media.sort.nameAsc",
  "name-desc": "admin.media.sort.nameDesc",
  largest: "admin.media.sort.largest",
  smallest: "admin.media.sort.smallest",
};

/** Kind filter -> dictionary key. */
const TYPE_LABEL_KEY: Record<MediaTypeFilter, string> = {
  all: "admin.media.filter.all",
  image: "admin.media.filter.image",
  video: "admin.media.filter.video",
};

/**
 * The media library grid.
 *
 * The page (server) has already read the FIRST page of rows; this component
 * appends the following pages as the operator scrolls to the foot of the grid
 * (`loadMoreMediaAction`), so the whole table is never handed to the browser at
 * once — and there is no pager to click. A spinner and a message show while
 * each next page is in flight.
 *
 * Filters still live in the URL (`search` / `type` / `sort`), so a refresh, a
 * bookmark or the back button restore exactly what the admin was looking at.
 * A filter change is a NEW list: the page remounts the grid with a
 * filter-derived `key`, which discards the pages accumulated for the old query.
 */
export function MediaLibrary({
  items,
  total,
  params,
}: {
  items: MediaLibraryItem[];
  total: number;
  params: MediaListParams;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  // Local mirror of the search term so typing stays instant; the URL catches up
  // on a debounce. Without the local copy the input would lag by a round trip
  // per keystroke.
  const [term, setTerm] = React.useState(params.search);

  // The URL is the source of truth, so when the server answers with a different
  // term — a back/forward navigation, or a cleared filter — the input has to
  // follow. This is React's documented "adjust state when a prop changes"
  // pattern: comparing against the last seen value and re-setting DURING render,
  // which avoids the extra paint that a syncing effect would cost (and which
  // `react-hooks/set-state-in-effect` rejects for exactly that reason).
  const [syncedSearch, setSyncedSearch] = React.useState(params.search);
  if (params.search !== syncedSearch) {
    setSyncedSearch(params.search);
    setTerm(params.search);
  }

  const navigate = React.useCallback(
    (overrides: Partial<MediaListParams>) => {
      const query = mediaListQueryString(params, overrides);
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    if (term === params.search) return;
    const id = setTimeout(() => navigate({ search: term, page: 1 }), 350);
    return () => clearTimeout(id);
  }, [term, params.search, navigate]);

  const filtered = hasMediaFilters(params);

  /**
   * Pages 2…n, appended by the scroll loader, plus the page the last
   * successful load returned. Page 1 arrives as the items prop from the
   * server render; the grid renders BOTH lists so an appended tile is
   * indistinguishable from a server-rendered one.
   */
  const [extraItems, setExtraItems] = React.useState<MediaLibraryItem[]>([]);
  const [loadedPage, setLoadedPage] = React.useState(1);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const allItems = React.useMemo(
    () => [...items, ...extraItems],
    [items, extraItems],
  );
  const hasMore = allItems.length < total;

  /** Synchronous guard: the observer may fire again before state settles. */
  const loadingRef = React.useRef(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const loadNextPage = React.useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const result = await loadMoreMediaAction({
        search: params.search || undefined,
        type: params.type,
        sort: params.sort,
        page: loadedPage + 1,
      });
      if (result.ok && result.data.items.length > 0) {
        setExtraItems((current) => [...current, ...result.data.items]);
        setLoadedPage(result.data.page);
      }
    } catch {
      toast.error(t("admin.error.unknown"));
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [loadedPage, params.search, params.sort, params.type, t]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNextPage();
      },
      { rootMargin: "240px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Derived from the COMBINED list so the details panel also opens for a tile
  // that arrived by scrolling.
  const selected = selectedId
    ? (allItems.find((item) => item.id === selectedId) ?? null)
    : null;

  const typeItems = Object.fromEntries(
    MEDIA_TYPE_FILTERS.map((filter) => [filter, t(TYPE_LABEL_KEY[filter])]),
  );
  const sortItems = Object.fromEntries(
    MEDIA_SORTS.map((sort) => [sort, t(SORT_LABEL_KEY[sort])]),
  );

  const clearFilters = () =>
    navigate({ search: "", type: "all", sort: "newest", page: 1 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2"
          />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("admin.media.search")}
            aria-label={t("admin.media.search")}
            className="h-8 ps-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={typeItems}
            value={params.type}
            onValueChange={(value) =>
              navigate({ type: value as MediaTypeFilter, page: 1 })
            }
          >
            <SelectTrigger aria-label={t("admin.media.type.label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {MEDIA_TYPE_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {t(TYPE_LABEL_KEY[filter])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={sortItems}
            value={params.sort}
            onValueChange={(value) =>
              navigate({ sort: value as MediaSort, page: 1 })
            }
          >
            <SelectTrigger aria-label={t("admin.media.sort.label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {MEDIA_SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(SORT_LABEL_KEY[sort])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allItems.length === 0 ? (
        <EmptyState filtered={filtered} onClear={clearFilters} />
      ) : (
        <ul
          aria-busy={isPending}
          className={cn(
            "grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
            isPending && "opacity-60",
          )}
        >
          {allItems.map((item) => (
            <li key={item.id}>
              <MediaCard item={item} onSelect={(next) => setSelectedId(next.id)} />
            </li>
          ))}
        </ul>
      )}

      {/*
        Infinite scroll: the grid shows the page-1 tiles the server rendered,
        then appends the next page each time the sentinel below scrolls into
        view — with a spinner and a message while the read is in flight.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {t("admin.media.showing")}{" "}
          <span className="tabular-nums">{allItems.length}</span> /{" "}
          <span className="tabular-nums">{total}</span>
        </p>
        {loadingMore ? (
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground flex items-center gap-2 text-xs"
          >
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            {t("admin.table.loadingMore")}
          </p>
        ) : null}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      ) : null}


      {selected ? (
        <MediaDetailsDialog
          key={selected.id}
          item={selected}
          open
          onOpenChange={(next) => {
            if (!next) setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * A pager control.
 *
 * A real link when it goes somewhere, a real disabled button when it does not —
 * rather than one anchor with `aria-disabled`, which is still focusable and
 * still navigable from the keyboard.
 */
/**
 * Two distinct empty states, because they need different actions.
 *
 * "Nothing here yet" offers the upload CTA; "nothing matched" offers to clear
 * the filters. Showing the upload CTA to someone who simply mistyped a search
 * term would be the wrong instruction.
 */
function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <ImageOff aria-hidden="true" className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {filtered ? t("admin.media.noResults") : t("admin.media.empty.title")}
        </p>
        <p className="text-muted-foreground text-xs">
          {filtered
            ? t("admin.media.noResultsHint")
            : t("admin.media.empty.hint")}
        </p>
      </div>
      {filtered ? (
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          {t("admin.media.clear")}
        </Button>
      ) : (
        <MediaUploadButton />
      )}
    </div>
  );
}
