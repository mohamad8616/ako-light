/**
 * Vercel Blob cleanup helpers (lib/admin/blob.ts) — which URLs this app may
 * delete, which URLs an edit actually dropped, and (Pass 13.5C) which objects
 * the media library still owns.
 *
 * The network call is mocked rather than made, so this file stays network-free
 * while still covering the deletion policy — including the guard that keeps a
 * replaced image's file alive for the Media row that points at it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteBlobUrls, isBlobUrl, removedUrls } from "@/lib/admin/blob";

const delMock = vi.hoisted(() => vi.fn());
const mediaFindMany = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({ del: delMock }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { media: { findMany: mediaFindMany } },
}));

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

describe("deleteBlobUrls — media ownership (Pass 13.5C)", () => {
  const SECOND =
    "https://store123.public.blob.vercel-storage.com/admin/products/b.png";

  beforeEach(() => {
    vi.clearAllMocks();
    delMock.mockResolvedValue(undefined);
    mediaFindMany.mockResolvedValue([]);
  });

  it("deletes a blob URL that no Media row owns", async () => {
    await deleteBlobUrls([BLOB]);

    expect(mediaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { url: { in: [BLOB] } } }),
    );
    expect(delMock).toHaveBeenCalledWith([BLOB]);
  });

  it("NEVER deletes the object a Media row still points at", async () => {
    mediaFindMany.mockResolvedValue([{ url: BLOB }]);

    await deleteBlobUrls([BLOB]);

    // The whole point of the pass: removing an image from an entity removes the
    // relationship, not the file. The Media row keeps rendering.
    expect(delMock).not.toHaveBeenCalled();
  });

  it("deletes only the unowned subset of a batch", async () => {
    mediaFindMany.mockResolvedValue([{ url: BLOB }]);

    await deleteBlobUrls([BLOB, SECOND]);

    expect(delMock).toHaveBeenCalledWith([SECOND]);
  });

  it("FAILS CLOSED when the ownership check itself fails — deletes nothing", async () => {
    mediaFindMany.mockRejectedValue(new Error("database unreachable"));

    await expect(deleteBlobUrls([BLOB])).resolves.toBeUndefined();

    // An orphan object is recoverable; deleting a file a live Media row needs
    // is not. When in doubt, keep the file.
    expect(delMock).not.toHaveBeenCalled();
  });

  it("touches neither the database nor the provider for non-blob URLs", async () => {
    await deleteBlobUrls(["https://images.example.com/seed/hero.jpg"]);

    expect(mediaFindMany).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });

  it("swallows a provider failure — cleanup must never fail a successful save", async () => {
    delMock.mockRejectedValue(new Error("blob is down"));

    await expect(deleteBlobUrls([BLOB])).resolves.toBeUndefined();
  });
});
