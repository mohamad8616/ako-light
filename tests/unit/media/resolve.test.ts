/**
 * Pass 13.5C plumbing — the URL/Media resolution rules and the FK reference
 * probes.
 *
 * Hermetic: Prisma is mocked, so this pins the POLICY (which source wins, which
 * keys are probed) without touching the database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  media: { findMany: vi.fn(), findFirst: vi.fn() },
  product: { count: vi.fn() },
  productImage: { count: vi.fn() },
  siteSettings: { count: vi.fn() },
  // The URL probes touch these; every one is stubbed so a probe list change
  // fails loudly here rather than silently returning zero.
  productCategory: { count: vi.fn() },
  designer: { count: vi.fn() },
  collection: { count: vi.fn() },
  material: { count: vi.fn() },
  flagship: { count: vi.fn() },
  project: { count: vi.fn() },
  orderItem: { count: vi.fn() },
  user: { count: vi.fn() },
  flagshipOneFeature: { count: vi.fn() },
  projectBannerFeature: { count: vi.fn() },
  projectDarkBackgroundFeature: { count: vi.fn() },
  homeCollectionFeature: { count: vi.fn() },
  catalogueFeature: { count: vi.fn() },
  productImageModel: { count: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  resolveMediaUrl,
  resolveOptionalMediaUrl,
} from "@/lib/media/resolve";
import { findMediaIdsByUrl } from "@/lib/repositories/media";
import { findMediaReferences } from "@/lib/repositories/media-references";

const MEDIA = { url: "https://store.public.blob.vercel-storage.com/media/x.png" };

describe("resolveMediaUrl — Media wins, legacy URL falls back", () => {
  it("prefers the linked Media row", () => {
    expect(resolveMediaUrl(MEDIA, "https://picsum.photos/legacy.jpg")).toBe(
      MEDIA.url,
    );
  });

  it("falls back to the legacy column when there is no link", () => {
    // This is the state of EVERY pre-existing row: the media table was empty
    // and all stored URLs are external, so `mediaId` is null.
    expect(resolveMediaUrl(null, "https://picsum.photos/legacy.jpg")).toBe(
      "https://picsum.photos/legacy.jpg",
    );
    expect(resolveMediaUrl(undefined, "https://picsum.photos/legacy.jpg")).toBe(
      "https://picsum.photos/legacy.jpg",
    );
  });

  it("keeps rendering after the Media row is deleted (FK is SET NULL)", () => {
    // Deleting a Media row nulls the relation, and the legacy URL is still
    // there — so the site does not break.
    expect(resolveMediaUrl(null, "https://example.com/still-here.jpg")).toBe(
      "https://example.com/still-here.jpg",
    );
  });
});

describe("resolveOptionalMediaUrl", () => {
  it("returns null when neither source has a value", () => {
    expect(resolveOptionalMediaUrl(null, null)).toBeNull();
    expect(resolveOptionalMediaUrl(undefined, undefined)).toBeNull();
    expect(resolveOptionalMediaUrl(null, "")).toBe("");
  });

  it("prefers Media over the legacy value", () => {
    expect(resolveOptionalMediaUrl(MEDIA, "legacy")).toBe(MEDIA.url);
  });
});

describe("findMediaIdsByUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.media.findMany.mockResolvedValue([]);
  });

  it("does not query at all when there are no URLs", async () => {
    const result = await findMediaIdsByUrl([null, undefined, ""]);

    expect(result.size).toBe(0);
    expect(prismaMock.media.findMany).not.toHaveBeenCalled();
  });

  it("maps each URL to its Media id", async () => {
    prismaMock.media.findMany.mockResolvedValue([
      { id: "m1", url: "https://a.test/1.png" },
      { id: "m2", url: "https://a.test/2.png" },
    ]);

    const result = await findMediaIdsByUrl([
      "https://a.test/1.png",
      "https://a.test/2.png",
      "https://picsum.photos/external.jpg",
    ]);

    expect(result.get("https://a.test/1.png")).toBe("m1");
    expect(result.get("https://a.test/2.png")).toBe("m2");
    // An external URL the library does not own simply has no relationship —
    // which is the correct answer, not a failure.
    expect(result.get("https://picsum.photos/external.jpg")).toBeUndefined();
  });

  it("de-duplicates the lookup keys", async () => {
    await findMediaIdsByUrl(["https://a.test/1.png", "https://a.test/1.png"]);

    expect(prismaMock.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { url: { in: ["https://a.test/1.png"] } } }),
    );
  });
});

describe("findMediaReferences — the FK probes", () => {
  /** Every URL probe returns zero; only the stubs below produce hits. */
  function allUrlProbesEmpty() {
    for (const model of [
      prismaMock.productCategory,
      prismaMock.designer,
      prismaMock.collection,
      prismaMock.material,
      prismaMock.flagship,
      prismaMock.project,
      prismaMock.orderItem,
      prismaMock.user,
      prismaMock.flagshipOneFeature,
      prismaMock.projectBannerFeature,
      prismaMock.projectDarkBackgroundFeature,
      prismaMock.homeCollectionFeature,
      prismaMock.catalogueFeature,
    ]) {
      model.count.mockResolvedValue(0);
    }
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.productImage.count.mockResolvedValue(0);
    prismaMock.siteSettings.count.mockResolvedValue(0);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    allUrlProbesEmpty();
    prismaMock.media.findFirst.mockResolvedValue(null);
  });

  it("reports a product image linked by mediaId", async () => {
    prismaMock.productImage.count.mockImplementation(
      async ({ where }: { where: { mediaId?: string } }) =>
        where.mediaId === "m1" ? 2 : 0,
    );

    const references = await findMediaReferences({ id: "m1", url: MEDIA.url });

    expect(references).toContainEqual({ area: "productImage.mediaId", count: 2 });
  });

  it("reports the site-settings brand assets", async () => {
    prismaMock.siteSettings.count.mockImplementation(
      async ({ where }: { where: { logoMediaId?: string; faviconMediaId?: string } }) =>
        where.logoMediaId === "m1" ? 1 : 0,
    );

    const references = await findMediaReferences({ id: "m1", url: MEDIA.url });

    expect(references).toContainEqual({
      area: "siteSettings.logoMediaId",
      count: 1,
    });
  });

  it("returns nothing for an object nothing references", async () => {
    expect(await findMediaReferences({ id: "m1", url: MEDIA.url })).toEqual([]);
  });

  it("resolves the id itself when called with only a URL, so FK probes still run", async () => {
    prismaMock.media.findFirst.mockResolvedValue({ id: "m1" });
    prismaMock.product.count.mockImplementation(
      async ({ where }: { where: { heroMediaId?: string } }) =>
        where.heroMediaId === "m1" ? 1 : 0,
    );

    const references = await findMediaReferences(MEDIA.url);

    // A string caller must not silently skip the authoritative check.
    expect(references).toContainEqual({ area: "product.heroMediaId", count: 1 });
  });

  it("returns nothing for an empty target", async () => {
    expect(await findMediaReferences({ url: "" })).toEqual([]);
  });
});
