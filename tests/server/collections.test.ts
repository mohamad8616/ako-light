/**
 * Pass 10.5 — repository tier: `lib/repositories/collections.ts`.
 *
 * Shape parity with the `Collection` interface from `lib/data/collections.ts`
 * (including the `{ p1, p2, p3 }` description block), null misses, seeded
 * count + curated `sortOrder` ordering, and React `cache()` request-scope
 * de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getCollection, getCollections } from "@/lib/repositories/collections";
import {
  expectKeys,
  expectLocalized,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const COLLECTION_KEYS = ["description", "id", "image", "name", "slug", "year"];

describeDb("collections repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known collection shaped exactly like lib/data's Collection", async () => {
    const collection = await getCollection("ritual-gravity");
    expect(collection).not.toBeNull();

    expectKeys(collection, COLLECTION_KEYS, "Collection");
    expectLocalized(collection!.name, "Collection.name");
    expect(typeof collection!.name, "Collection.name").toBe("object");
    expect(collection!.slug, "Collection.slug").toBe("ritual-gravity");
    expect(collection!.id, "Collection.id").toBeTypeOf("string");
    expect(collection!.year, "Collection.year").toBeTypeOf("string");
    expect(collection!.image, "Collection.image").toBeTypeOf("string");

    const description = collection!
      .description as unknown as Record<string, unknown>;
    for (const paragraph of ["p1", "p2", "p3"] as const) {
      expectLocalized(description[paragraph], `Collection.description.${paragraph}`);
    }
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getCollection("no-such-collection")).toBeNull();
  });

  it("lists every seeded collection in sortOrder order", async () => {
    const [collections, count, dbRows] = await Promise.all([
      getCollections(),
      prisma.collection.count(),
      prisma.collection.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(collections, "collection count").toHaveLength(count);
    expect(collections.map((collection) => collection.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    // getCollection(slug) probes findUnique by slug, then findFirst by id on a
    // miss — the unknown slug exercises both statements.
    const findUnique = vi.spyOn(prisma.collection, "findUnique");
    const findFirst = vi.spyOn(prisma.collection, "findFirst");
    const findMany = vi.spyOn(prisma.collection, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getCollection("ritual-gravity"),
        getCollection("ritual-gravity"),
      ]);
      expect(a).toEqual(b);

      const [missA, missB] = await Promise.all([
        getCollection("no-such-collection"),
        getCollection("no-such-collection"),
      ]);
      expect(missA).toBeNull();
      expect(missB).toBeNull();

      const [listA, listB] = await Promise.all([
        getCollections(),
        getCollections(),
      ]);
      expect(listA).toEqual(listB);
    });

    // Two invocations, one pair of statements each: found → findUnique only;
    // missed → findUnique + findFirst. The second invocation of each pair is
    // served from the request cache.
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
