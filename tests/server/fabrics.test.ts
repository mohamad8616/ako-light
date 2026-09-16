/**
 * Pass 11A — repository tier: `lib/repositories/fabrics.ts`.
 *
 * Shape parity with the `FabricItem` interface from `lib/data/materials.ts`,
 * null misses, seeded count + curated `sortOrder` ordering, and React
 * `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getFabricItem, getFabricItems } from "@/lib/repositories/fabrics";
import {
  expectKeys,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const FABRIC_KEYS = ["category", "code", "id", "name", "swatchColor"];

describeDb("fabrics repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known fabric shaped exactly like lib/data's FabricItem", async () => {
    const fabric = await getFabricItem("abarth-26");
    expect(fabric).not.toBeNull();

    expectKeys(fabric!, FABRIC_KEYS, "FabricItem");
    expect(typeof fabric!.name, "FabricItem.name").toBe("string");
    expect(fabric!.id, "FabricItem.id").toBe("abarth-26");
    expect(fabric!.code, "FabricItem.code").toBe("26");
    expect(fabric!.category, "FabricItem.category").toBe("Fabrics");
    expect(fabric!.swatchColor, "FabricItem.swatchColor")
      .toBeTypeOf("string");
    expect(fabric!.swatchColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("returns null (not undefined, not an error) for an unknown id", async () => {
    expect(await getFabricItem("no-such-fabric")).toBeNull();
  });

  it("lists every seeded fabric in sortOrder order", async () => {
    const [fabrics, count, dbRows] = await Promise.all([
      getFabricItems(),
      prisma.fabricItem.count(),
      prisma.fabricItem.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(fabrics, "fabric count").toHaveLength(count);
    expect(fabrics.map((fabric) => fabric.id)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.fabricItem, "findUnique");
    const findMany = vi.spyOn(prisma.fabricItem, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getFabricItem("abarth-26"),
        getFabricItem("abarth-26"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([getFabricItems(), getFabricItems()]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
