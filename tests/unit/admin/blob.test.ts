/**
 * Vercel Blob cleanup helpers (lib/admin/blob.ts) — which URLs this app may
 * delete, and which URLs an edit actually dropped.
 *
 * Only the pure predicates are exercised here; `deleteBlobUrls` talks to the
 * Blob API and is never called from a network-free unit test.
 */
import { describe, expect, it } from "vitest";
import { isBlobUrl, removedUrls } from "@/lib/admin/blob";

const BLOB = "https://store123.public.blob.vercel-storage.com/admin/products/a.png";

describe("isBlobUrl", () => {
  it("accepts public blob URLs", () => {
    expect(isBlobUrl(BLOB)).toBe(true);
  });

  it("accepts other blob host shapes (private store subdomains)", () => {
    expect(
      isBlobUrl("https://store123.blob.vercel-storage.com/a.png"),
    ).toBe(true);
  });

  it("rejects seeded/legacy external URLs — those are not ours to delete", () => {
    expect(isBlobUrl("https://images.example.com/seed/hero.jpg")).toBe(false);
    expect(isBlobUrl("https://cdn.shopify.com/s/files/1.jpg")).toBe(false);
  });

  it("rejects root-relative paths and placeholders", () => {
    expect(isBlobUrl("/images/hero.jpg")).toBe(false);
    expect(isBlobUrl("#")).toBe(false);
  });

  it("rejects empty, null and unparseable values without throwing", () => {
    expect(isBlobUrl("")).toBe(false);
    expect(isBlobUrl(null)).toBe(false);
    expect(isBlobUrl(undefined)).toBe(false);
    expect(isBlobUrl("not a url at all")).toBe(false);
  });

  it("rejects a look-alike host that merely contains the blob domain", () => {
    expect(
      isBlobUrl("https://blob.vercel-storage.com.evil.test/a.png"),
    ).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isBlobUrl("javascript:alert(1)")).toBe(false);
    expect(isBlobUrl("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("removedUrls", () => {
  it("returns the URLs an edit dropped", () => {
    expect(removedUrls([BLOB, "https://x.test/old.png"], [BLOB])).toEqual([
      "https://x.test/old.png",
    ]);
  });

  it("keeps a URL that merely moved position", () => {
    const urls = [BLOB, "https://store123.public.blob.vercel-storage.com/b.png"];
    expect(removedUrls(urls, [...urls].reverse())).toEqual([]);
  });

  it("treats a cleared (empty/null) field as dropping the old URL", () => {
    expect(removedUrls([BLOB], [""])).toEqual([BLOB]);
    expect(removedUrls([BLOB], [null])).toEqual([BLOB]);
  });

  it("ignores empty entries in the before state", () => {
    expect(removedUrls(["", null, undefined], [""])).toEqual([]);
  });

  it("de-duplicates repeated URLs", () => {
    expect(removedUrls([BLOB, BLOB], [])).toEqual([BLOB]);
  });

  it("returns nothing when nothing changed", () => {
    expect(removedUrls([BLOB], [BLOB])).toEqual([]);
  });
});
