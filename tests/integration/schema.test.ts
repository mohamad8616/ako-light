/**
 * Pass 9.5 — database/schema integration tests (the "Step 3" schema + seed).
 *
 * Unlike tests/unit this tier intentionally hits the real dev database the
 * Prisma client from `lib/db/prisma.ts` is configured against. It verifies the
 * invariants the seed is supposed to guarantee on the *database copy* of the
 * catalog data (the static-file equivalents live in tests/unit/data):
 *
 * - referential integrity of every FK (Product→Category, Product→Designer,
 *   ProjectProduct→Project+Product),
 * - slug uniqueness within every seeded model,
 * - non-zero row counts (catches a seed that ran against the wrong database
 *   or failed partway),
 * - Localized jsonb columns really holding `{ en, fa }` with non-empty
 *   strings.
 *
 * Read-only: safe to run against the database the dev server is also using.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  expectLocalized,
  expectLocalizedList,
  hasDatabaseUrl,
} from "@/tests/helpers/db";

if (!hasDatabaseUrl) {
  console.warn(
    "[integration] DATABASE_URL is not set in the test environment — " +
      "skipping the Pass 9.5 database tests. Add it to .env (or export it) " +
      "to run this tier.",
  );
}

const describeDb = describe.skipIf(!hasDatabaseUrl);

describeDb("catalog schema & seed integrity (dev database)", () => {
  beforeAll(async () => {
    // Fail loudly and early if the database is unreachable — an opaque
    // per-test ECONNREFUSED is not an acceptable report.
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has every seeded table populated", async () => {
    const counts: [string, () => Promise<number>][] = [
      ["product_category", () => prisma.productCategory.count()],
      ["designer", () => prisma.designer.count()],
      ["product", () => prisma.product.count()],
      ["collection", () => prisma.collection.count()],
      ["material", () => prisma.material.count()],
      ["flagship", () => prisma.flagship.count()],
      ["project", () => prisma.project.count()],
      ["project_product", () => prisma.projectProduct.count()],
    ];

    for (const [table, count] of counts) {
      expect(await count(), `${table} rows`).toBeGreaterThan(0);
    }
  });

  it("has unique slugs within every model", async () => {
    const checks: [string, () => Promise<string[]>][] = [
      [
        "ProductCategory",
        async () =>
          (
            await prisma.productCategory.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Product",
        async () =>
          (
            await prisma.product.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Designer",
        async () =>
          (
            await prisma.designer.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Collection",
        async () =>
          (
            await prisma.collection.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Material",
        async () =>
          (
            await prisma.material.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Flagship",
        async () =>
          (
            await prisma.flagship.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
      [
        "Project",
        async () =>
          (
            await prisma.project.findMany({ select: { slug: true } })
          ).map((row) => row.slug),
      ],
    ];

    for (const [model, slugs] of checks) {
      const list = await slugs();
      expect(list.length, `${model} rows`).toBeGreaterThan(0);
      expect(new Set(list).size, `${model} duplicate slugs`).toBe(list.length);
    }
  });

  it("resolves every Product.categoryId to a real ProductCategory", async () => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ select: { categoryId: true } }),
      prisma.productCategory.findMany({ select: { slug: true } }),
    ]);

    // Per the schema's FK convention, Product.categoryId references the
    // parent's *slug*.
    const known = new Set(categories.map((category) => category.slug));
    const orphans = products
      .map((product) => product.categoryId)
      .filter((categoryId) => !known.has(categoryId));

    expect(orphans, "orphaned Product.categoryId values").toEqual([]);
  });

  it("resolves every non-null Product.designerId to a real Designer", async () => {
    const [products, designers] = await Promise.all([
      prisma.product.findMany({
        select: { designerId: true },
        where: { designerId: { not: null } },
      }),
      prisma.designer.findMany({ select: { slug: true } }),
    ]);

    const known = new Set(designers.map((designer) => designer.slug));
    const orphans = products
      .map((product) => product.designerId)
      .filter((designerId) => designerId !== null && !known.has(designerId));

    expect(orphans, "orphaned Product.designerId values").toEqual([]);
  });

  it("resolves every ProjectProduct row to a real Project and Product", async () => {
    const [links, projects, products] = await Promise.all([
      prisma.projectProduct.findMany(),
      prisma.project.findMany({ select: { slug: true } }),
      prisma.product.findMany({ select: { slug: true } }),
    ]);

    const projectSlugs = new Set(projects.map((project) => project.slug));
    const productSlugs = new Set(products.map((product) => product.slug));

    const orphanedProjects = links
      .map((link) => link.projectId)
      .filter((projectId) => !projectSlugs.has(projectId));
    const orphanedProducts = links
      .map((link) => link.productId)
      .filter((productId) => !productSlugs.has(productId));

    expect(orphanedProjects, "orphaned ProjectProduct.projectId").toEqual([]);
    expect(orphanedProducts, "orphaned ProjectProduct.productId").toEqual([]);
  });

  it("stores every Localized name column as { en, fa } with non-empty strings", async () => {
    // Full coverage of the one field every model shares.
    const rows: [string, () => Promise<{ slug: string; name: unknown }[]>][] = [
      [
        "ProductCategory",
        () =>
          prisma.productCategory.findMany({
            select: { slug: true, name: true },
          }),
      ],
      [
        "Product",
        () => prisma.product.findMany({ select: { slug: true, name: true } }),
      ],
      [
        "Designer",
        () => prisma.designer.findMany({ select: { slug: true, name: true } }),
      ],
      [
        "Collection",
        () =>
          prisma.collection.findMany({ select: { slug: true, name: true } }),
      ],
      [
        "Material",
        () => prisma.material.findMany({ select: { slug: true, name: true } }),
      ],
      [
        "Flagship",
        () => prisma.flagship.findMany({ select: { slug: true, name: true } }),
      ],
      [
        "Project",
        () => prisma.project.findMany({ select: { slug: true, name: true } }),
      ],
    ];

    for (const [model, rowsFor] of rows) {
      for (const row of await rowsFor()) {
        expectLocalized(row.name, `${model}(${row.slug}).name`);
      }
    }
  });

  it("stores the remaining Localized jsonb columns as { en, fa } (spot-check per model)", async () => {
    const product = await prisma.product.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    expectLocalized(product?.description, "Product.description");
    // `moreInfo` is optional in the source data — only checked when present.
    if (product?.moreInfo != null) {
      expectLocalized(product.moreInfo, "Product.moreInfo");
    }

    const designer = await prisma.designer.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    expectLocalizedList(designer?.bio, "Designer.bio");

    const collection = await prisma.collection.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    const description = collection?.description as
      | { p1?: unknown; p2?: unknown; p3?: unknown }
      | null;
    expectLocalized(description?.p1, "Collection.description.p1");
    expectLocalized(description?.p2, "Collection.description.p2");
    expectLocalized(description?.p3, "Collection.description.p3");

    const material = await prisma.material.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    expectLocalized(material?.description, "Material.description");

    const flagship = await prisma.flagship.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    expectLocalized(flagship?.city, "Flagship.city");

    const detailRow = await prisma.flagship.findUnique({
      where: { slug: "henge-milan" },
    });
    expect(detailRow?.detail, "Flagship(henge-milan).detail").not.toBeNull();
    const detail = detailRow?.detail as
      | { heading?: unknown; description?: unknown }
      | null;
    expectLocalized(detail?.heading, "Flagship.detail.heading");
    expectLocalized(detail?.description, "Flagship.detail.description");

    const project = await prisma.project.findFirst({
      orderBy: { sortOrder: "asc" },
    });
    expectLocalized(project?.description, "Project.description");
    expectLocalized(project?.paragraph, "Project.paragraph");
    expectLocalizedList(project?.moreDescription, "Project.moreDescription");
  });
});
