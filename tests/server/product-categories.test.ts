/**
 * Pass 10.5 — repository tier: `lib/repositories/product-categories.ts`.
 *
 * Shape parity with `ProductCategory` from
 * `lib/data/product-categories/types.ts`, null misses, seeded count + curated
 * `sortOrder` ordering, and React `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  getProductCategories,
  getProductCategory,
} from "@/lib/repositories/product-categories";
import {
  expectKeys,
  expectLocalized,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const CATEGORY_KEYS = ["id", "i18nKey", "name", "products", "slug"];

describeDb("product-categories repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known category shaped exactly like lib/data's ProductCategory", async () => {
    const category = await getProductCategory("lighting");
    expect(category).not.toBeNull();

    expectKeys(category, CATEGORY_KEYS, "ProductCategory");
    expectLocalized(category!.name, "ProductCategory.name");
    expect(typeof category!.name, "ProductCategory.name").toBe("object");
    expect(category!.i18nKey, "ProductCategory.i18nKey").toBeTypeOf("string");

    expect(Array.isArray(category!.products), "products").toBe(true);
    for (const product of category!.products) {
      expect(product.category, "product.category").toBe(category!.slug);
    }
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getProductCategory("no-such-category")).toBeNull();
  });

  it("lists every seeded category in sortOrder order", async () => {
    const [categories, count, dbRows] = await Promise.all([
      getProductCategories(),
      prisma.productCategory.count(),
      prisma.productCategory.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(categories, "category count").toHaveLength(count);
    expect(categories.map((category) => category.id)).toEqual(
      dbRows.map((row) => row.id),
    );

    // Every category carries its products embedded.
    const productTotal = categories.reduce(
      (sum, category) => sum + category.products.length,
      0,
    );
    expect(productTotal, "embedded product total").toBe(
      await prisma.product.count(),
    );
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.productCategory, "findUnique");
    const findMany = vi.spyOn(prisma.productCategory, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getProductCategory("lighting"),
        getProductCategory("lighting"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([
        getProductCategories(),
        getProductCategories(),
      ]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
