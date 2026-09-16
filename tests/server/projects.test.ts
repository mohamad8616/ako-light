/**
 * Pass 10.5 — repository tier: `lib/repositories/projects.ts`.
 *
 * Shape parity with the `Project` interface from `lib/data/projects.ts`
 * (including the rebuilt `productsUsed` join), null misses, seeded count +
 * curated `sortOrder` ordering, and React `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  getProject,
  getProjectById,
  getProjects,
} from "@/lib/repositories/projects";
import {
  expectKeys,
  expectLocalized,
  expectLocalizedList,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const PROJECT_KEYS = [
  "credits",
  "description",
  "id",
  "i18nKey",
  "image",
  "location",
  "moreDescription",
  "name",
  "paragraph",
  "portfolioImages",
  "productsUsed",
  "year",
];

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

describeDb("projects repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known project shaped exactly like lib/data's Project", async () => {
    const project = await getProject("h-istra");
    expect(project).not.toBeNull();

    expectKeys(project, PROJECT_KEYS, "Project");
    expectLocalized(project!.name, "Project.name");
    expectLocalized(project!.description, "Project.description");
    expectLocalized(project!.paragraph, "Project.paragraph");
    expect(typeof project!.name, "Project.name").toBe("object");
    expectLocalizedList(project!.moreDescription, "Project.moreDescription");
    expect(project!.id, "Project.id").toBe("h-istra");
    expect(project!.i18nKey, "Project.i18nKey").toBeTypeOf("string");
    expect(project!.location, "Project.location").toBeTypeOf("string");
    expect(project!.year, "Project.year").toBeTypeOf("string");
    expect(Array.isArray(project!.portfolioImages), "portfolioImages").toBe(true);

    // credits entries are Localized objects or plain strings.
    for (const [i, credit] of project!.credits.entries()) {
      if (typeof credit === "string") continue;
      expectLocalized(credit, `Project.credits[${i}]`);
    }

    // productsUsed is rebuilt from the join table, ordered by `order`.
    const dbOrder = await prisma.projectProduct.findMany({
      where: { projectId: "h-istra" },
      select: { productId: true },
      orderBy: { order: "asc" },
    });
    expect(project!.productsUsed.map((product) => product.slug)).toEqual(
      dbOrder.map((link) => link.productId),
    );
    for (const product of project!.productsUsed) {
      expectKeys(product, PRODUCT_KEYS, "Project.productsUsed[]");
    }
  });

  it("resolves getProjectById as an alias of getProject", async () => {
    const bySlug = await getProject("h-istra");
    const byId = await getProjectById("h-istra");
    expect(byId).not.toBeNull();
    expect(byId).toEqual(bySlug);
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getProject("no-such-project")).toBeNull();
    expect(await getProjectById("no-such-project")).toBeNull();
  });

  it("lists every seeded project in sortOrder order", async () => {
    const [projects, count, dbRows] = await Promise.all([
      getProjects(),
      prisma.project.count(),
      prisma.project.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(projects, "project count").toHaveLength(count);
    expect(projects.map((project) => project.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.project, "findUnique");
    const findMany = vi.spyOn(prisma.project, "findMany");

    await withRequestCache(async () => {
      // getProjectById wraps the already-cached getProject, so all three calls
      // share one cache entry.
      const [a, b, c] = await Promise.all([
        getProject("h-istra"),
        getProject("h-istra"),
        getProjectById("h-istra"),
      ]);
      expect(a).toEqual(b);
      expect(c).toEqual(a);

      const [listA, listB] = await Promise.all([getProjects(), getProjects()]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
