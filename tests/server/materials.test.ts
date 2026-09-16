/**
 * Pass 10.5 — repository tier: `lib/repositories/materials.ts`.
 *
 * Shape parity with the `Material` interface from `lib/data/materials.ts`
 * (including the Prisma-enum → union `type` mapping), null misses, seeded
 * count + curated `sortOrder` ordering, and React `cache()` request-scope
 * de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getMaterial, getMaterials } from "@/lib/repositories/materials";
import {
  expectKeys,
  expectLocalized,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const MATERIAL_KEYS = ["category", "description", "id", "image", "name", "type"];

const MATERIAL_TYPES = new Set([
  "stone",
  "metal",
  "glass",
  "wood",
  "fabric",
  "leather",
  "marble",
  "stone-composite",
]);

describeDb("materials repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known material shaped exactly like lib/data's Material", async () => {
    const material = await getMaterial("breccia-medicea");
    expect(material).not.toBeNull();

    expectKeys(material, MATERIAL_KEYS, "Material");
    expectLocalized(material!.name, "Material.name");
    expectLocalized(material!.description, "Material.description");
    expect(typeof material!.name, "Material.name").toBe("object");
    expect(material!.id, "Material.id").toBe("breccia-medicea");
    expect(material!.category, "Material.category").toBeTypeOf("string");
    expect(material!.image, "Material.image").toBeTypeOf("string");
    // The Prisma enum must map back onto the app's union (e.g. the DB-stored
    // "stone-composite", not the enum member name "stone_composite").
    expect(
      MATERIAL_TYPES.has(material!.type),
      `Material.type ∈ union (got ${material!.type})`,
    ).toBe(true);
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getMaterial("no-such-material")).toBeNull();
  });

  it("lists every seeded material in sortOrder order", async () => {
    const [materials, count, dbRows] = await Promise.all([
      getMaterials(),
      prisma.material.count(),
      prisma.material.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(materials, "material count").toHaveLength(count);
    expect(materials.map((material) => material.id)).toEqual(
      dbRows.map((row) => row.id),
    );
    for (const material of materials) {
      expectLocalized(material.description, `Material(${material.id}).description`);
    }
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.material, "findUnique");
    const findFirst = vi.spyOn(prisma.material, "findFirst");
    const findMany = vi.spyOn(prisma.material, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getMaterial("breccia-medicea"),
        getMaterial("breccia-medicea"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([getMaterials(), getMaterials()]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledTimes(0);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
