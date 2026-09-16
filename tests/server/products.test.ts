/**
 * Pass 10.5 — repository tier: `lib/repositories/products.ts`.
 *
 * Hits the real dev database (read-only). Verifies shape parity with the
 * `Product` interface from `lib/data/product-categories/types.ts`, null (not
 * error/undefined) misses, list length/order against the seeded rows, and the
 * React `cache()` request-scope de-duping via the real react-server cache.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  getProduct,
  getProducts,
  getProductsByCategory,
  getProductsByIdsOrSlugs,
} from "@/lib/repositories/products";
import {
  expectKeys,
  expectLocalized,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const PRODUCT_KEYS = [
  "category",
  "categoryLabel",
  "description",
  "designer",
  "downloads",
  "heroImage",
  "hoverImage",
  "id",
  "images",
  "moreInfo",
  "name",
  "price",
  "related",
  "slug",
  "store",
];

describeDb("products repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known product shaped exactly like lib/data's Product", async () => {
    const product = await getProduct("lighting", "pendant-light");
    expect(product).not.toBeNull();

    expectKeys(product, PRODUCT_KEYS, "Product");
    expectLocalized(product!.name, "Product.name");
    expectLocalized(product!.description, "Product.description");
    // Json columns must come back parsed, not as raw strings.
    expect(typeof product!.name, "Product.name").toBe("object");
    expect(product!.price, "Product.price").toBeTypeOf("number");
    expect(Array.isArray(product!.images), "Product.images").toBe(true);
    expect(product!.store).toEqual({
      existsInStore: expect.any(Boolean),
      quantity: expect.any(Number),
    });
    expect(product!.category, "Product.category").toBe("lighting");

    expect(Array.isArray(product!.downloads), "Product.downloads").toBe(true);
    for (const link of product!.downloads) {
      expectLocalized(link.label, "Product.downloads[].label");
      expect(link.href).toBeTypeOf("string");
    }

    expect(Array.isArray(product!.related), "Product.related").toBe(true);
    for (const related of product!.related) {
      expectLocalized(related.name, "Product.related[].name");
      expect(related.slug).toBeTypeOf("string");
      expect(related.category).toBeTypeOf("string");
      expect(related.image).toBeTypeOf("string");
    }

    const designer = product!.designer;
    expect(designer).toBeTypeOf("object");
    if (designer.href !== "") {
      expectLocalized(designer.name, "Product.designer.name");
      expect(designer.href).toMatch(/^\/designers\//);
    }
  });

  it("accepts the single-argument global-slug form", async () => {
    const byPair = await getProduct("lighting", "pendant-light");
    const bySlug = await getProduct("pendant-light");
    expect(bySlug).not.toBeNull();
    expect(bySlug).toEqual(byPair);
  });

  it("returns null (not undefined, not an error) for unknown slugs", async () => {
    expect(await getProduct("does-not-exist")).toBeNull();
    expect(await getProduct("no-such-category", "pendant-light")).toBeNull();
    expect(await getProduct("lighting", "no-such-product")).toBeNull();
  });

  it("lists every seeded product in category-then-position order", async () => {
    const [products, count, dbRows] = await Promise.all([
      getProducts(),
      prisma.product.count(),
      prisma.product.findMany({
        select: { id: true },
        orderBy: [
          { category: { sortOrder: "asc" } },
          { sortOrder: "asc" },
        ],
      }),
    ]);

    expect(products, "product count").toHaveLength(count);
    expect(products.map((product) => product.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("lists one category's products in curated order", async () => {
    const [products, count, dbRows] = await Promise.all([
      getProductsByCategory("lighting"),
      prisma.product.count({ where: { categoryId: "lighting" } }),
      prisma.product.findMany({
        where: { categoryId: "lighting" },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(products, "lighting product count").toHaveLength(count);
    expect(products.map((product) => product.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("resolves batch lookups by id or slug", async () => {
    const catalog = await getProducts();
    const keys = catalog
      .slice(0, 3)
      .map((product) => ({ productId: product.id, slug: product.slug }));

    const resolved = await getProductsByIdsOrSlugs(keys);
    expect(resolved.map((product) => product.id).sort()).toEqual(
      catalog.slice(0, 3).map((product) => product.id).sort(),
    );

    expect(await getProductsByIdsOrSlugs([])).toEqual([]);
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.product, "findUnique");
    const findMany = vi.spyOn(prisma.product, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getProduct("lighting", "pendant-light"),
        getProduct("lighting", "pendant-light"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([getProducts(), getProducts()]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("executes again in a fresh request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.product, "findUnique");

    await withRequestCache(async () => {
      await getProduct("lighting", "pendant-light");
    });
    await withRequestCache(async () => {
      await getProduct("lighting", "pendant-light");
    });

    // A new "request" must not be served from the previous request's cache.
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
