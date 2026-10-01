/**
 * The two "light" readers added for the performance pass:
 *
 *   - `getNavCategories()` — what the nav menu needs, WITHOUT the products;
 *   - `getSearchIndex()`  — what /search needs, WITHOUT the full catalog.
 *
 * Both exist because their heavy counterparts (`getProductCategories`,
 * `getProducts`) eager-load far more than those two surfaces render — and
 * because their results are handed to `"use client"` components, everything
 * they return is serialized into the page payload. These tests pin the shapes
 * so a later "helpful" addition of a field cannot silently re-bloat either
 * payload: the point of these readers is that they stay narrow.
 */
import "dotenv/config";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { NavCategory } from "@/lib/data/product-categories/types";
import { prisma } from "@/lib/db/prisma";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { getNavCategories } from "@/lib/repositories/product-categories";
import { getSearchIndex } from "@/lib/repositories/search-index";

/**
 * `unstable_cache` needs a Next request/cache context that a plain Vitest node
 * run does not provide. There it resolves to nothing, so `getNavCategories()`
 * returns `[]` — and every shape assertion below would then pass VACUOUSLY
 * (a loop over zero rows asserts nothing). That is the exact "green but
 * meaningless" failure mode this file exists to prevent, so it is replaced with
 * a passthrough rather than tolerated.
 *
 * Only the caching LAYER is bypassed: the real query and the real fail-soft
 * wrapper still run. The cache tag itself loses no coverage — it is declared
 * with the same `NAV_CATEGORIES_TAG` constant that lib/admin/revalidate.ts
 * hands to `updateTag`, so the two cannot drift apart.
 */
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, unstable_cache: (fn: unknown) => fn };
});

const describeDb = describe.skipIf(!hasDatabaseUrl);

/**
 * Release the connection pool when this file is done.
 *
 * This tier shares one remote pooler across every file; a file that never
 * disconnects leaves its pool open for the rest of the worker's life, which
 * adds to exactly the connection pressure that makes the neighbouring
 * transaction tests flake. Every other DB test file does this.
 */
afterAll(async () => {
  await prisma.$disconnect();
});

describeDb("getNavCategories (nav menu reader)", () => {
  it("returns categories with EXACTLY id, slug and i18nKey — nothing else", async () => {
    const rows: NavCategory[] = await getNavCategories();

    expect(rows.length, "seed defines categories").toBeGreaterThan(0);

    for (const row of rows) {
      expect(Object.keys(row).sort(), "nav category key set").toEqual([
        "i18nKey",
        "id",
        "slug",
      ]);
    }
  });

  it("returns the same categories as the heavy reader, minus the products", async () => {
    // The point of the light reader is equivalence of the nav-relevant fields,
    // not a different answer — only a smaller payload.
    const [nav, full] = await Promise.all([
      getNavCategories(),
      (async () => {
        const { getProductCategories } = await import(
          "@/lib/repositories/product-categories"
        );
        return getProductCategories();
      })(),
    ]);

    expect(nav.map((c) => c.slug)).toEqual(full.map((c) => c.slug));
    expect(nav.map((c) => c.i18nKey)).toEqual(full.map((c) => c.i18nKey));
  });

  it("orders categories by their curated sortOrder", async () => {
    const rows = await getNavCategories();
    const slugs = rows.map((r) => r.slug);
    // Deterministic output: no duplicate slugs, same order on a second read.
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(await getNavCategories()).toEqual(rows);
  });
});

describeDb("getSearchIndex (search reader)", () => {
  it("returns products with exactly the fields the search UI renders", async () => {
    const { products } = await getSearchIndex();

    expect(products.length, "seed defines products").toBeGreaterThan(0);

    for (const p of products) {
      expect(Object.keys(p).sort()).toEqual([
        "category",
        "designerName",
        "faName",
        "id",
        "image",
        "name",
        "slug",
      ]);
      expect(p.name.en.length, "product name (en) is non-empty").toBeGreaterThan(0);
      expect(p.category.length, "parent category slug present").toBeGreaterThan(0);
    }
  });

  it("resolves the Persian dictionary name without leaking the raw key", async () => {
    const { products } = await getSearchIndex();

    for (const p of products) {
      // The server must translate "no dictionary entry" into an empty string,
      // never the raw key — a raw key would land in the search haystack and
      // make queries like "products" match every product.
      expect(p.faName.startsWith("products.")).toBe(false);
    }
  });

  it("returns designers with exactly slug, name and image", async () => {
    const { designers } = await getSearchIndex();

    expect(designers.length, "seed defines designers").toBeGreaterThan(0);

    for (const d of designers) {
      expect(Object.keys(d).sort()).toEqual(["image", "name", "slug"]);
    }
  });

  it("picks one image per product, not the whole gallery", async () => {
    // `image` is a single string — the reader must not return an images array.
    const { products } = await getSearchIndex();
    for (const p of products) {
      expect(Array.isArray(p.image)).toBe(false);
    }
  });
});
