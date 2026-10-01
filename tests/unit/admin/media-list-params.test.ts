/**
 * The media library's query-string boundary (lib/media/library.ts).
 *
 * This is untrusted input: `searchParams` comes straight from the URL, and an
 * admin can hand-edit it, a bookmark can outlive a schema change, and a stale
 * link can carry a page number that no longer exists. The parser's contract is
 * therefore total — every input maps to a LEGAL state, and nothing throws.
 *
 * Pure and hermetic: the module has no imports at all, which is exactly why it
 * can be tested here and imported by the client grid.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEDIA_LIST_PARAMS,
  MEDIA_LIBRARY_PAGE_SIZE,
  MEDIA_SEARCH_MAX,
  hasMediaFilters,
  mediaListQueryString,
  mediaOffset,
  mediaPageCount,
  parseMediaListParams,
  type MediaListParams,
} from "@/lib/media/library";

const params = (overrides: Partial<MediaListParams> = {}): MediaListParams => ({
  ...DEFAULT_MEDIA_LIST_PARAMS,
  ...overrides,
});

describe("parseMediaListParams", () => {
  it("returns the canonical defaults for an empty query string", () => {
    expect(parseMediaListParams({})).toEqual(DEFAULT_MEDIA_LIST_PARAMS);
  });

  it("reads every supported field", () => {
    expect(
      parseMediaListParams({
        page: "3",
        search: "  hero  ",
        type: "video",
        sort: "largest",
      }),
    ).toEqual({ page: 3, search: "hero", type: "video", sort: "largest" });
  });

  it("falls back per-field, so one bad value cannot discard the others", () => {
    expect(
      parseMediaListParams({ page: "nope", search: "chair", type: "audio", sort: "sideways" }),
    ).toEqual({ page: 1, search: "chair", type: "all", sort: "newest" });
  });

  it("never yields a page below 1", () => {
    for (const raw of ["0", "-4", "-1", "0.4"]) {
      expect(parseMediaListParams({ page: raw }).page).toBe(1);
    }
  });

  it("truncates a fractional page rather than rejecting it", () => {
    expect(parseMediaListParams({ page: "2.9" }).page).toBe(2);
  });

  it("ignores a page that is not a number", () => {
    // "1e3" is deliberately NOT read as 1000: parseInt stops at the "e" and
    // yields 1, which is the same benign fallback as a blank value.
    for (const raw of ["", "abc", "1e3", "Infinity"]) {
      expect(parseMediaListParams({ page: raw }).page).toBe(1);
    }
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseMediaListParams({ page: ["2", "9"], type: ["image", "video"] })).toMatchObject({
      page: 2,
      type: "image",
    });
  });

  it("caps an over-long search term", () => {
    const parsed = parseMediaListParams({ search: "a".repeat(MEDIA_SEARCH_MAX + 50) });
    expect(parsed.search).toHaveLength(MEDIA_SEARCH_MAX);
  });

  it("treats a whitespace-only search as absent", () => {
    expect(parseMediaListParams({ search: "   " }).search).toBe("");
  });

  it("accepts every advertised sort and filter value", () => {
    for (const sort of ["newest", "oldest", "name-asc", "name-desc", "largest", "smallest"]) {
      expect(parseMediaListParams({ sort }).sort).toBe(sort);
    }
    for (const type of ["all", "image", "video"]) {
      expect(parseMediaListParams({ type }).type).toBe(type);
    }
  });
});

describe("mediaOffset", () => {
  it("is zero-based", () => {
    expect(mediaOffset(1)).toBe(0);
    expect(mediaOffset(2)).toBe(MEDIA_LIBRARY_PAGE_SIZE);
    expect(mediaOffset(3)).toBe(MEDIA_LIBRARY_PAGE_SIZE * 2);
  });

  it("clamps a nonsensical page to the first one", () => {
    expect(mediaOffset(0)).toBe(0);
    expect(mediaOffset(-5)).toBe(0);
  });

  it("honours an explicit page size", () => {
    expect(mediaOffset(3, 10)).toBe(20);
  });
});

describe("mediaPageCount", () => {
  it("is always at least 1, so an empty library reads 'page 1 of 1'", () => {
    expect(mediaPageCount(0)).toBe(1);
  });

  it("rounds a partial last page up", () => {
    expect(mediaPageCount(1)).toBe(1);
    expect(mediaPageCount(MEDIA_LIBRARY_PAGE_SIZE)).toBe(1);
    expect(mediaPageCount(MEDIA_LIBRARY_PAGE_SIZE + 1)).toBe(2);
    expect(mediaPageCount(MEDIA_LIBRARY_PAGE_SIZE * 3)).toBe(3);
  });
});

describe("mediaListQueryString", () => {
  it("omits every default, so the canonical URL stays bare", () => {
    expect(mediaListQueryString(params())).toBe("");
  });

  it("serializes only the fields that differ from the default", () => {
    expect(mediaListQueryString(params({ page: 2 }))).toBe("?page=2");
    expect(mediaListQueryString(params({ type: "image" }))).toBe("?type=image");
    expect(mediaListQueryString(params({ sort: "largest" }))).toBe("?sort=largest");
  });

  it("encodes a search term so it survives the round trip", () => {
    const query = mediaListQueryString(params({ search: "a b&c" }));

    // The exact escaping is URLSearchParams' business (it writes a space as
    // "+"); what matters is that parsing the query string gives the term back.
    const parsed = parseMediaListParams(
      Object.fromEntries(new URLSearchParams(query.slice(1))),
    );
    expect(parsed.search).toBe("a b&c");
  });

  it("applies overrides on top of the current state", () => {
    const current = params({ page: 4, search: "chair", type: "image", sort: "largest" });

    // Changing a filter resets the page — the caller passes { page: 1 }.
    expect(mediaListQueryString(current, { page: 1 })).toBe(
      `?search=chair&type=image&sort=largest`,
    );
    // Paging keeps every filter.
    expect(mediaListQueryString(current, { page: 2 })).toBe(
      `?page=2&search=chair&type=image&sort=largest`,
    );
  });

  it("can clear a filter by overriding it with the default", () => {
    const current = params({ search: "chair", type: "video" });
    expect(mediaListQueryString(current, { search: "", type: "all" })).toBe("");
  });
});

describe("hasMediaFilters", () => {
  it("is false for the canonical state", () => {
    expect(hasMediaFilters(params())).toBe(false);
  });

  it("ignores the page — paging is not a filter", () => {
    expect(hasMediaFilters(params({ page: 5 }))).toBe(false);
  });

  it("is true as soon as anything narrows the set", () => {
    expect(hasMediaFilters(params({ search: "a" }))).toBe(true);
    expect(hasMediaFilters(params({ type: "image" }))).toBe(true);
    expect(hasMediaFilters(params({ sort: "oldest" }))).toBe(true);
  });
});
