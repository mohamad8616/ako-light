/**
 * Pass 11A — repository tier: `lib/repositories/catalogue.ts`.
 *
 * Shape parity with the `CatalogueItem` interface from `lib/data/catalogue.ts`,
 * null misses, seeded count + curated `sortOrder` ordering, and React
 * `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getCatalogueItem, getCatalogueItems } from "@/lib/repositories/catalogue";
import {
  expectKeys,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const CATALOGUE_KEYS = ["coverColor", "coverTextColor", "href", "id", "title"];

describeDb("catalogue repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known catalogue shaped exactly like lib/data's CatalogueItem", async () => {
    // "s34-4" is known to have coverTextColor in lib/data/catalogue.ts
    const catalogue = await getCatalogueItem("s34-4");
    expect(catalogue).not.toBeNull();

    expectKeys(catalogue!, CATALOGUE_KEYS, "CatalogueItem");
    expect(typeof catalogue!.title, "CatalogueItem.title").toBe("string");
    expect(catalogue!.id, "CatalogueItem.id").toBe("s34-4");
    expect(catalogue!.href, "CatalogueItem.href").toBeTypeOf("string");
    expect(catalogue!.coverColor, "CatalogueItem.coverColor").toBeTypeOf("string");
    expect(catalogue!.coverColor).toBe("#dfe1e6");
    // coverTextColor is optional but present on "s34-4"
    expect(catalogue!.coverTextColor).toBeTypeOf("string");
    expect(catalogue!.coverTextColor).toBe("#232323");
  });

  it("returns null (not undefined, not an error) for an unknown id", async () => {
    expect(await getCatalogueItem("no-such-catalogue")).toBeNull();
  });

  it("lists every seeded catalogue in sortOrder order", async () => {
    const [catalogues, count, dbRows] = await Promise.all([
      getCatalogueItems(),
      prisma.catalogueItem.count(),
      prisma.catalogueItem.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(catalogues, "catalogue count").toHaveLength(count);
    expect(catalogues.map((catalogue) => catalogue.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.catalogueItem, "findUnique");
    const findMany = vi.spyOn(prisma.catalogueItem, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getCatalogueItem("s34-5"),
        getCatalogueItem("s34-5"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([
        getCatalogueItems(),
        getCatalogueItems(),
      ]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
