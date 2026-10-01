/**
 * Pass 13.5B — the media LIBRARY's two new data-access pieces, against the real
 * dev database:
 *
 *   - `listMediaPage` (lib/repositories/media.ts) — the server-backed
 *     search / filter / sort / paging read the grid is built on;
 *   - `findMediaReferences` (lib/repositories/media-references.ts) — the guard
 *     that stops a delete from breaking a page that still points at the asset.
 *
 * Same two strategies as tests/server/media.test.ts, and for the same reason
 * (do not disturb the shared database):
 *
 *   - WRITE tests run inside a transaction that is rolled back, using the
 *     repository's `db` seam. Nothing is committed, so nothing can leak.
 *   - READ tests need committed rows (`listMediaPage` takes no transaction
 *     client), so their fixtures ARE committed and removed again in `afterAll`.
 *
 * Every fixture is namespaced with this run's token, and every assertion is
 * scoped to that token — never a global count, which is the assertion shape
 * that has made this project's DB tiers flaky before.
 *
 * `media` has no `sortOrder` and no public route, so even a fixture that
 * survived a killed run would be invisible to the site.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MaterialType, MediaType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MEDIA_LIBRARY_PAGE_SIZE, type MediaSort } from "@/lib/media/library";
import { createMedia, listMediaPage } from "@/lib/repositories/media";
import { findMediaReferences } from "@/lib/repositories/media-references";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { TX_OPTIONS } from "@/tests/helpers/tx";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const ROLLBACK = "intentional test rollback";

/** Namespace every fixture so this run can find (and clean) exactly its own. */
const RUN = randomUUID().slice(0, 8);
const keyFor = (suffix: string) => `media/lib-${RUN}/${suffix}`;
const nameFor = (suffix: string) => `lib-${RUN}-${suffix}`;

/** Runs `fn` inside a transaction that is always rolled back. */
async function inRollback(
  fn: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  await expect(
    prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Error(ROLLBACK);
    }, TX_OPTIONS),
  ).rejects.toThrow(ROLLBACK);
}

/** Committed fixtures for the read tests. */
const committed: string[] = [];

async function commitFixture(
  suffix: string,
  overrides: Partial<Parameters<typeof createMedia>[0]> = {},
) {
  const row = await createMedia({
    filename: nameFor(suffix),
    storageKey: keyFor(suffix),
    url: `https://store.public.blob.vercel-storage.com/${keyFor(suffix)}`,
    mimeType: "image/png",
    size: 1234,
    ...overrides,
  });
  committed.push(row.id);
  return row;
}

describeDb("media library — listMediaPage", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    if (committed.length > 0) {
      await prisma.media.deleteMany({ where: { id: { in: committed } } });
    }
    // Belt and braces: catch anything this run created that is not tracked.
    await prisma.media.deleteMany({
      where: { storageKey: { startsWith: `media/lib-${RUN}/` } },
    });
    await prisma.$disconnect();
  });

  /** Three rows with distinct names, sizes, titles and kinds. */
  async function seedThree() {
    await commitFixture("alpha", { size: 100, title: "Alpha title" });
    await commitFixture("bravo", { size: 300, alt: "Bravo alt text" });
    await commitFixture("charlie", {
      size: 200,
      title: "Charlie title",
      mimeType: "video/mp4",
      mediaType: MediaType.video,
    });
  }

  /** This run's rows, in the order the query returned them. */
  const mine = (rows: { filename: string }[]) =>
    rows.filter((row) => row.filename.startsWith(`lib-${RUN}-`));

  it("reports the matching total alongside the page, not the table size", async () => {
    await seedThree();

    const { rows, total } = await listMediaPage({ search: RUN, limit: 100 });

    // Scoped to this run: `total` counts what MATCHED, so it must equal the
    // three rows this test created rather than every row in the table.
    expect(total).toBe(3);
    expect(rows).toHaveLength(3);
  });

  it("returns an empty page and a zero total when nothing matches", async () => {
    const { rows, total } = await listMediaPage({
      search: `no-such-media-${RUN}`,
    });

    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });

  it("never returns more than the page size by default", async () => {
    const { rows } = await listMediaPage({});

    expect(rows.length).toBeLessThanOrEqual(MEDIA_LIBRARY_PAGE_SIZE);
  });

  it("honours an explicit limit and offset for paging", async () => {
    const first = await listMediaPage({ search: RUN, limit: 2, offset: 0 });
    const second = await listMediaPage({ search: RUN, limit: 2, offset: 2 });

    expect(first.rows).toHaveLength(2);
    expect(second.rows).toHaveLength(1);
    // The second page must not repeat the first.
    const firstIds = first.rows.map((row) => row.id);
    for (const row of second.rows) expect(firstIds).not.toContain(row.id);
  });

  describe("search", () => {
    it("matches the filename case-insensitively", async () => {
      const { rows } = await listMediaPage({ search: `LIB-${RUN}-ALPHA` });
      expect(rows.map((row) => row.filename)).toEqual([nameFor("alpha")]);
    });

    it("matches a title", async () => {
      const { rows } = await listMediaPage({ search: "Alpha title" });
      expect(rows.map((row) => row.filename)).toContain(nameFor("alpha"));
    });

    it("matches alt text", async () => {
      const { rows } = await listMediaPage({ search: "Bravo alt" });
      expect(rows.map((row) => row.filename)).toContain(nameFor("bravo"));
    });

    it("treats a blank search as no filter at all", async () => {
      const blank = await listMediaPage({ search: "   ", limit: 100 });
      const none = await listMediaPage({ limit: 100 });
      expect(blank.total).toBe(none.total);
    });
  });

  describe("kind filter", () => {
    it("restricts to images and excludes the video", async () => {
      const { rows } = await listMediaPage({
        search: RUN,
        mediaType: MediaType.image,
        limit: 100,
      });

      expect(rows).toHaveLength(2);
      for (const row of rows) expect(row.mediaType).toBe(MediaType.image);
    });

    it("restricts to videos", async () => {
      const { rows } = await listMediaPage({
        search: RUN,
        mediaType: MediaType.video,
        limit: 100,
      });

      expect(rows.map((row) => row.filename)).toEqual([nameFor("charlie")]);
    });
  });

  describe("sorting", () => {
    /** The order of this run's rows after a sort, as bare suffixes. */
    const orderOf = async (sort: MediaSort) => {
      const { rows } = await listMediaPage({ search: RUN, sort, limit: 100 });
      return mine(rows).map((row) => row.filename.replace(`lib-${RUN}-`, ""));
    };

    it("orders by name ascending and descending", async () => {
      expect(await orderOf("name-asc")).toEqual(["alpha", "bravo", "charlie"]);
      expect(await orderOf("name-desc")).toEqual(["charlie", "bravo", "alpha"]);
    });

    it("orders by size, largest and smallest first", async () => {
      // Sizes: bravo 300, charlie 200, alpha 100.
      expect(await orderOf("largest")).toEqual(["bravo", "charlie", "alpha"]);
      expect(await orderOf("smallest")).toEqual(["alpha", "charlie", "bravo"]);
    });

    it("orders by createdAt, newest and oldest first", async () => {
      const newest = await orderOf("newest");
      const oldest = await orderOf("oldest");

      // Asserted as a reversal rather than a fixed order: rows created in the
      // same millisecond would otherwise make the assertion depend on
      // tie-breaking (same reasoning as tests/server/media.test.ts).
      expect([...newest].reverse()).toEqual(oldest);
    });

    it("defaults to newest-first", async () => {
      const explicit = await orderOf("newest");
      const { rows } = await listMediaPage({ search: RUN, limit: 100 });
      expect(mine(rows).map((row) => row.filename.replace(`lib-${RUN}-`, ""))).toEqual(
        explicit,
      );
    });
  });
});

describeDb("media references — findMediaReferences", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** A material pointing at `url`, created inside the caller's transaction. */
  const material = (url: string) => ({
    id: `lib-ref-${RUN}-material`,
    slug: `lib-ref-${RUN}-material`,
    name: { en: "Ref material", fa: "ماده ارجاعی" },
    category: "Stone",
    type: MaterialType.stone,
    image: url,
    description: { en: "d", fa: "د" },
  });

  it("finds the row that points at the object", async () => {
    const url = `https://store.public.blob.vercel-storage.com/media/lib-${RUN}/referenced.png`;

    await inRollback(async (tx) => {
      await tx.material.create({ data: material(url) });

      const references = await findMediaReferences(url, tx);

      expect(references).toEqual([{ area: "material.image", count: 1 }]);
    });
  });

  it("counts every row in an area, not just the first", async () => {
    const url = `https://store.public.blob.vercel-storage.com/media/lib-${RUN}/twice.png`;

    await inRollback(async (tx) => {
      await tx.material.create({ data: material(url) });
      await tx.material.create({
        data: { ...material(url), id: `${material(url).id}-b`, slug: `${material(url).slug}-b` },
      });

      const references = await findMediaReferences(url, tx);

      expect(references).toEqual([{ area: "material.image", count: 2 }]);
    });
  });

  it("returns nothing for an object no one points at", async () => {
    await inRollback(async (tx) => {
      const references = await findMediaReferences(
        `https://store.public.blob.vercel-storage.com/media/lib-${RUN}/orphan.png`,
        tx,
      );

      expect(references).toEqual([]);
    });
  });

  it("stops reporting an area once the reference is cleared", async () => {
    const url = `https://store.public.blob.vercel-storage.com/media/lib-${RUN}/cleared.png`;

    await inRollback(async (tx) => {
      const created = await tx.material.create({ data: material(url) });
      expect(await findMediaReferences(url, tx)).toHaveLength(1);

      await tx.material.update({
        where: { id: created.id },
        data: { image: "https://example.com/other.png" },
      });

      expect(await findMediaReferences(url, tx)).toEqual([]);
    });
  });

  it("treats an empty URL as unreferenced rather than querying every column", async () => {
    await inRollback(async (tx) => {
      expect(await findMediaReferences("", tx)).toEqual([]);
    });
  });
});
