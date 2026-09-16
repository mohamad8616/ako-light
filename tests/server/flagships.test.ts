/**
 * Pass 10.5 — repository tier: `lib/repositories/flagships.ts`.
 *
 * Shape parity with `Flagship`, `FlagshipDetail` and `FlagshipWithDetail` from
 * `lib/data/flagships.ts`, null misses, seeded count + curated `sortOrder`
 * ordering, and React `cache()` request-scope de-duping.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  getFlagship,
  getFlagshipDetail,
  getFlagships,
  getFlagshipsWithDetail,
} from "@/lib/repositories/flagships";
import {
  expectKeys,
  expectLocalized,
  hasDatabaseUrl,
  withRequestCache,
} from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const FLAGSHIP_KEYS = ["city", "image", "name", "slug"];

describeDb("flagships repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a known flagship shaped exactly like lib/data's Flagship", async () => {
    const flagship = await getFlagship("henge-milan");
    expect(flagship).not.toBeNull();

    expectKeys(flagship, FLAGSHIP_KEYS, "Flagship");
    expectLocalized(flagship!.name, "Flagship.name");
    expectLocalized(flagship!.city, "Flagship.city");
    expect(typeof flagship!.name, "Flagship.name").toBe("object");
    expect(flagship!.slug, "Flagship.slug").toBe("henge-milan");
    expect(flagship!.image, "Flagship.image").toBeTypeOf("string");
  });

  it("returns null (not undefined, not an error) for an unknown slug", async () => {
    expect(await getFlagship("no-such-showroom")).toBeNull();
  });

  it("returns the built-out detail content for henge-milan", async () => {
    const detail = await getFlagshipDetail("henge-milan");
    expect(detail).not.toBeNull();

    expectLocalized(detail!.heading, "FlagshipDetail.heading");
    expectLocalized(detail!.description, "FlagshipDetail.description");
    expect(detail!.heroImage, "heroImage").toBeTypeOf("string");
    expect(detail!.info.phone, "info.phone").toBeTypeOf("string");
    expect(detail!.info.email, "info.email").toBeTypeOf("string");
    expect(Array.isArray(detail!.info.addressLines), "info.addressLines").toBe(true);
    expect(Array.isArray(detail!.info.hours), "info.hours").toBe(true);
    expect(Array.isArray(detail!.gallery), "gallery").toBe(true);
    expect(detail!.video.thumbnail).toBeTypeOf("string");
  });

  it("returns null detail for a flagship without detail content", async () => {
    const detail = await getFlagshipDetail("no-such-showroom");
    expect(detail).toBeNull();
  });

  it("lists every seeded flagship in sortOrder order", async () => {
    const [flagships, count, dbRows] = await Promise.all([
      getFlagships(),
      prisma.flagship.count(),
      prisma.flagship.findMany({
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    expect(flagships, "flagship count").toHaveLength(count);
    expect(flagships.map((flagship) => flagship.slug)).toEqual(
      dbRows.map((row) => row.id),
    );
  });

  it("merges summaries with detail content for built-out flagships only", async () => {
    const rows = await prisma.flagship.findMany({ select: { detail: true } });
    const withDetailCount = rows.filter((row) => row.detail != null).length;
    expect(withDetailCount, "seeded flagships with detail").toBeGreaterThan(0);

    const merged = await getFlagshipsWithDetail();
    expect(merged).toHaveLength(withDetailCount);

    for (const entry of merged) {
      expectKeys(entry, [...FLAGSHIP_KEYS, "description", "gallery", "heading", "heroImage", "info", "video"], "FlagshipWithDetail");
      expectLocalized(entry.heading, "FlagshipWithDetail.heading");
      expectLocalized(entry.city, "FlagshipWithDetail.city");
    }
  });

  it("de-dupes repeat lookups within one request cache scope", async () => {
    const findUnique = vi.spyOn(prisma.flagship, "findUnique");
    const findMany = vi.spyOn(prisma.flagship, "findMany");

    await withRequestCache(async () => {
      const [a, b] = await Promise.all([
        getFlagship("henge-milan"),
        getFlagship("henge-milan"),
      ]);
      expect(a).toEqual(b);

      const [listA, listB] = await Promise.all([
        getFlagships(),
        getFlagships(),
      ]);
      expect(listA).toEqual(listB);
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
