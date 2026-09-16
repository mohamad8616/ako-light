/**
 * Pass 10.5 — repository tier: `lib/repositories/designers.ts`.
 *
 * Shape parity with the `Designer` interface from `lib/data/designers.ts`,
 * null misses, seeded count + curated `sortOrder` ordering, and React
 * `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getDesigner, getDesigners } from "@/lib/repositories/designers";
import {
  expectKeys,
  expectLocalized,
  expectLocalizedList,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const DESIGNER_KEYS = ["bio", "image", "name", "slug", "website"];

describeDb("designers repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known designer shaped exactly like lib/data's Designer", async () => {
    const designer = await getDesigner("massimo-castagna");
    expect(designer).not.toBeNull();

    expectKeys(designer, DESIGNER_KEYS, "Designer");
    expectLocalized(designer!.name, "Designer.name");
    expect(typeof designer!.name, "Designer.name").toBe("object");
    expect(designer!.slug, "Designer.slug").toBe("massimo-castagna");
    expect(designer!.image, "Designer.image").toBeTypeOf("string");
    expectLocalizedList(designer!.bio, "Designer.bio");
    // website is optional; when set it must be a string.
    if (designer!.website !== undefined) {
      expect(designer!.website).toBeTypeOf("string");
    }
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getDesigner("no-such-designer")).toBeNull();
  });

  it("lists every seeded designer in sortOrder order", async () => {
    const [designers, count, dbRows] = await Promise.all([
      getDesigners(),
      prisma.designer.count(),
      prisma.designer.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(designers, "designer count").toHaveLength(count);
    expect(designers.map((designer) => designer.slug)).toEqual(
      dbRows.map((row) => row.id),
    );
    for (const designer of designers) {
      expectLocalizedList(designer.bio, `Designer(${designer.slug}).bio`);
    }
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.designer, "findUnique");
    const findMany = vi.spyOn(prisma.designer, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getDesigner("massimo-castagna"),
        getDesigner("massimo-castagna"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([getDesigners(), getDesigners()]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
