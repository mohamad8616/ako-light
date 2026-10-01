/**
 * The media LIBRARY's query vocabulary — the shared, dependency-free half of
 * `/admin/media`.
 *
 * Why this is its own module: the same small vocabulary is needed by three
 * layers that must not import each other.
 *
 *   - the repository (`lib/repositories/media.ts`) sorts and pages with it;
 *   - the server page (`app/[locale]/(admin)/admin/media/page.tsx`) parses the
 *     URL with it;
 *   - the client grid (`components/admin/media/*`) renders controls from it.
 *
 * The client is the reason for the strict rule below: this module has NO
 * imports at all — no Prisma, no generated client, no `lib/db`. The generated
 * client's module top level pulls `node:process`/`node:path`, so a single value
 * import from it would drag a database client into the browser bundle. Keeping
 * the vocabulary here is what lets the grid share the page size and the sort
 * list with the server without that happening.
 */

/** How the library orders a page of rows. Mirrors the repository's order-by map. */
export type MediaSort =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "largest"
  | "smallest";

/** Every sort the toolbar offers, in the order it renders them. */
export const MEDIA_SORTS: readonly MediaSort[] = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "largest",
  "smallest",
];

/** The kind of a media row, without the storage/DB enum's dependency. */
export type MediaKind = "image" | "video";

/**
 * The toolbar's kind filter. `all` is the absence of a filter, not a third
 * kind — the UI still offers it as a single choice because a select needs a
 * value to render.
 */
export type MediaTypeFilter = "all" | MediaKind;

export const MEDIA_TYPE_FILTERS: readonly MediaTypeFilter[] = [
  "all",
  "image",
  "video",
];

/**
 * Rows per library page.
 *
 * Deliberately its own constant rather than the repository's
 * `DEFAULT_MEDIA_PAGE_SIZE` (50): 50 tiles is a heavy first paint, while 24
 * fills a 6-column grid four times over and stays inside the 20–40 the plan
 * asks for.
 */
export const MEDIA_LIBRARY_PAGE_SIZE = 24;

/**
 * Upper bound on a search term.
 *
 * The term becomes a `contains` (ILIKE) across three columns, so an unbounded
 * query string is a cheap way to make the database scan. A filename is never
 * this long, so truncating costs nothing real.
 */
export const MEDIA_SEARCH_MAX = 100;

/** The library's state, already normalised — every field is a legal value. */
export interface MediaListParams {
  /** 1-based page number. */
  page: number;
  /** Trimmed search term; `""` when absent. */
  search: string;
  type: MediaTypeFilter;
  sort: MediaSort;
}

/** The canonical, URL-free state — what `/admin/media` renders when bare. */
export const DEFAULT_MEDIA_LIST_PARAMS: MediaListParams = {
  page: 1,
  search: "",
  type: "all",
  sort: "newest",
};

/** A media row flattened for the client grid (Date -> ISO string). */
export interface MediaLibraryItem {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  /** Size in bytes. */
  size: number;
  width: number | null;
  height: number | null;
  mediaType: MediaKind;
  alt: string | null;
  title: string | null;
  /** ISO-8601, so the DTO stays plain and serializable across the RSC boundary. */
  createdAt: string;
}

/** The shape Next hands a page for `searchParams` (a key may repeat). */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return (allowed as readonly string[]).includes(value);
}

/**
 * Normalises the raw `searchParams` of the media route.
 *
 * NEVER throws and never rejects: an unknown, blank or malformed value falls
 * back to that field's default, so a hand-edited or truncated URL renders the
 * library instead of an error page. This is the whole reason parsing lives in a
 * pure function rather than inline in the page — it is the boundary where
 * untrusted input is reduced to a legal state, and it is tested as such.
 */
export function parseMediaListParams(raw: RawSearchParams): MediaListParams {
  const rawPage = firstValue(raw.page);
  const parsedPage = rawPage === undefined ? Number.NaN : Number.parseInt(rawPage, 10);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  const search = (firstValue(raw.search) ?? "").trim().slice(0, MEDIA_SEARCH_MAX);

  const rawType = firstValue(raw.type);
  const type =
    rawType !== undefined && isOneOf(rawType, MEDIA_TYPE_FILTERS)
      ? rawType
      : DEFAULT_MEDIA_LIST_PARAMS.type;

  const rawSort = firstValue(raw.sort);
  const sort =
    rawSort !== undefined && isOneOf(rawSort, MEDIA_SORTS)
      ? rawSort
      : DEFAULT_MEDIA_LIST_PARAMS.sort;

  return { page, search, type, sort };
}

/** Rows to skip for a 1-based page. */
export function mediaOffset(
  page: number,
  pageSize: number = MEDIA_LIBRARY_PAGE_SIZE,
): number {
  return (Math.max(1, Math.floor(page)) - 1) * pageSize;
}

/**
 * Total pages for a row count.
 *
 * Always at least 1, so the pager reads "Page 1 of 1" on an empty library
 * rather than "of 0" — an empty grid should look empty, not broken.
 */
export function mediaPageCount(
  total: number,
  pageSize: number = MEDIA_LIBRARY_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The query string for a library link, with defaults omitted.
 *
 * Omitting them keeps the canonical URL short — the bare library is
 * `/admin/media`, not `?page=1&type=all&sort=newest` — which also means the
 * "clear filters" link is simply the path itself.
 *
 * `overrides` are applied on top of `params`; callers changing a filter pass
 * `{ page: 1 }` alongside it so a narrowed result set cannot land on a page
 * that no longer exists.
 */
export function mediaListQueryString(
  params: MediaListParams,
  overrides: Partial<MediaListParams> = {},
): string {
  const merged = { ...params, ...overrides };
  const query = new URLSearchParams();
  if (merged.page > 1) query.set("page", String(merged.page));
  if (merged.search) query.set("search", merged.search);
  if (merged.type !== "all") query.set("type", merged.type);
  if (merged.sort !== "newest") query.set("sort", merged.sort);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

/** Whether any filter deviates from the default — drives the "clear" affordance. */
export function hasMediaFilters(params: MediaListParams): boolean {
  return params.search !== "" || params.type !== "all" || params.sort !== "newest";
}
