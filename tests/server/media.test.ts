/**
 * Pass 13.5 Step 9 — media repository (lib/repositories/media.ts) against the
 * real dev database.
 *
 * Two deliberate strategies, both aimed at NOT disturbing the shared database:
 *
 *   - WRITE tests run inside a transaction that is rolled back, using the
 *     repository's `db` seam. Nothing is committed, so nothing can leak.
 *   - READ tests need committed rows (the `cache()`-wrapped getters take no
 *     transaction client), so their fixtures ARE committed and removed again in
 *     `afterAll`. Every key is namespaced per run, and every assertion is scoped
 *     to THIS run's keys — never a global count, which is the assertion shape
 *     that has made this project's DB tiers flaky before.
 *
 * `media` has no `sortOrder` and no public route, so even a fixture that
 * survived a killed run would be invisible to the site.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MediaType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createMedia,
  deleteMedia,
  getMedia,
  getMediaByStorageKey,
  listMedia,
  updateMediaMetadata,
} from "@/lib/repositories/media";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { TX_OPTIONS } from "@/tests/helpers/tx";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const ROLLBACK = "intentional test rollback";

/** Namespace every fixture so this run can find (and clean) exactly its own. */
const RUN = randomUUID().slice(0, 8);
const keyFor = (suffix: string) => `media/test-${RUN}/${suffix}.png`;
const nameFor = (suffix: string) => `test-${RUN}-${suffix}.png`;

/** A minimal row body; `storageKey` must stay unique per test. */
function body(suffix: string, overrides: Partial<Parameters<typeof createMedia>[0]> = {}) {
  return {
    filename: nameFor(suffix),
    storageKey: keyFor(suffix),
    url: `https://store.public.blob.vercel-storage.com/${keyFor(suffix)}`,
    mimeType: "image/png",
    size: 1234,
    ...overrides,
  };
}

/** Runs `fn` inside a transaction that is always rolled back. */
async function inRollback(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  await expect(
    prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Error(ROLLBACK);
    }, TX_OPTIONS),
  ).rejects.toThrow(ROLLBACK);
}

const p2002 = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
const p2025 = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

/** Committed fixtures for the read tests. */
const committed: string[] = [];

async function commitFixture(
  suffix: string,
  overrides: Partial<Parameters<typeof createMedia>[0]> = {},
) {
  const row = await createMedia(body(suffix, overrides));
  committed.push(row.id);
  return row;
}

describeDb("media repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    if (committed.length > 0) {
      await prisma.media.deleteMany({ where: { id: { in: committed } } });
    }
    // Belt and braces: catch anything this run created that is not tracked.
    await prisma.media.deleteMany({ where: { storageKey: { startsWith: `media/test-${RUN}/` } } });
    await prisma.$disconnect();
  });

  describe("createMedia", () => {
    it("persists every metadata field and returns the created row", async () => {
      await inRollback(async (tx) => {
        const row = await createMedia(
          body("full", {
            width: 1200,
            height: 800,
            duration: null,
            alt: "A chair",
            title: "Hero",
          }),
          tx,
        );

        expect(row.storageKey).toBe(keyFor("full"));
        expect(row.filename).toBe(nameFor("full"));
        expect(row.mimeType).toBe("image/png");
        expect(row.size).toBe(1234);
        expect(row.width).toBe(1200);
        expect(row.height).toBe(800);
        expect(row.alt).toBe("A chair");
        expect(row.title).toBe("Hero");
        expect(row.createdAt).toBeInstanceOf(Date);
        expect(row.updatedAt).toBeInstanceOf(Date);
      });
    });

    it("defaults mediaType to image and the optional fields to null", async () => {
      await inRollback(async (tx) => {
        const row = await createMedia(body("defaults"), tx);

        expect(row.mediaType).toBe(MediaType.image);
        expect(row.width).toBeNull();
        expect(row.height).toBeNull();
        expect(row.duration).toBeNull();
        expect(row.alt).toBeNull();
        expect(row.title).toBeNull();
      });
    });

    it("accepts an explicit video mediaType", async () => {
      await inRollback(async (tx) => {
        const row = await createMedia(
          body("video", { mimeType: "video/mp4", mediaType: MediaType.video, duration: 42 }),
          tx,
        );

        expect(row.mediaType).toBe(MediaType.video);
        expect(row.duration).toBe(42);
      });
    });

    it("generates a uuid id", async () => {
      await inRollback(async (tx) => {
        const row = await createMedia(body("uuid"), tx);
        expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });
    });

    it("rejects a duplicate storageKey — the database is the last line of defence", async () => {
      await inRollback(async (tx) => {
        await createMedia(body("dupe"), tx);

        // Two rows must never own one object, so this is a hard error rather
        // than something the caller is expected to pre-check.
        const error = await createMedia(body("dupe"), tx).catch((e: unknown) => e);
        expect(p2002(error), `expected P2002, got ${String(error)}`).toBe(true);
      });
    });
  });

  describe("updateMediaMetadata", () => {
    it("patches only the supplied fields", async () => {
      await inRollback(async (tx) => {
        const created = await createMedia(body("patch", { alt: "keep me", title: "old" }), tx);

        const updated = await updateMediaMetadata(created.id, { title: "new" }, tx);

        expect(updated.title).toBe("new");
        // A patch of { title } must not silently null out `alt`.
        expect(updated.alt).toBe("keep me");
      });
    });

    it("clears a field when null is passed explicitly", async () => {
      await inRollback(async (tx) => {
        const created = await createMedia(body("clear", { alt: "remove me" }), tx);

        const updated = await updateMediaMetadata(created.id, { alt: null }, tx);

        expect(updated.alt).toBeNull();
      });
    });

    it("backfills the probe fields a later pass will populate", async () => {
      await inRollback(async (tx) => {
        const created = await createMedia(body("probe"), tx);
        expect(created.width).toBeNull();

        const updated = await updateMediaMetadata(
          created.id,
          { width: 1920, height: 1080, duration: 30 },
          tx,
        );

        expect([updated.width, updated.height, updated.duration]).toEqual([1920, 1080, 30]);
      });
    });

    it("throws P2025 for an unknown id", async () => {
      await inRollback(async (tx) => {
        const error = await updateMediaMetadata(randomUUID(), { alt: "x" }, tx).catch(
          (e: unknown) => e,
        );
        expect(p2025(error), `expected P2025, got ${String(error)}`).toBe(true);
      });
    });
  });

  describe("deleteMedia", () => {
    it("returns the deleted row (so the caller gets the storageKey) and removes it", async () => {
      await inRollback(async (tx) => {
        const created = await createMedia(body("delete"), tx);

        const removed = await deleteMedia(created.id, tx);

        // Returning the row is what lets removeMedia delete the object without
        // a second read — and without a race in which the row is already gone.
        expect(removed.id).toBe(created.id);
        expect(removed.storageKey).toBe(keyFor("delete"));
        expect(await tx.media.findUnique({ where: { id: created.id } })).toBeNull();
      });
    });

    it("throws P2025 for an unknown id", async () => {
      await inRollback(async (tx) => {
        const error = await deleteMedia(randomUUID(), tx).catch((e: unknown) => e);
        expect(p2025(error), `expected P2025, got ${String(error)}`).toBe(true);
      });
    });
  });

  describe("getMedia / getMediaByStorageKey", () => {
    it("retrieves a committed row by id", async () => {
      const created = await commitFixture("read-id");

      const found = await getMedia(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.storageKey).toBe(keyFor("read-id"));
      expect(found?.createdAt).toBeInstanceOf(Date);
    });

    it("retrieves a committed row by storage key", async () => {
      await commitFixture("read-key");

      const found = await getMediaByStorageKey(keyFor("read-key"));

      expect(found?.storageKey).toBe(keyFor("read-key"));
    });

    it("returns null — not undefined, not an error — for unknown lookups", async () => {
      expect(await getMedia(randomUUID())).toBeNull();
      expect(await getMediaByStorageKey(`media/test-${RUN}/no-such-key.png`)).toBeNull();
    });
  });

  describe("listMedia", () => {
    it("includes committed rows and returns them newest-first", async () => {
      await commitFixture("list-a");
      await commitFixture("list-b");

      const rows = await listMedia({ limit: 100 });
      const mine = rows.filter((row) => row.storageKey.startsWith(`media/test-${RUN}/`));

      expect(mine.length).toBeGreaterThanOrEqual(2);

      // Newest-first, asserted as a property rather than an exact order: rows
      // created in the same millisecond would otherwise make the assertion
      // depend on tie-breaking.
      for (let i = 1; i < rows.length; i += 1) {
        expect(
          rows[i - 1].createdAt.getTime(),
          "listMedia is ordered by createdAt descending",
        ).toBeGreaterThanOrEqual(rows[i].createdAt.getTime());
      }
    });

    it("respects the limit", async () => {
      const rows = await listMedia({ limit: 2 });
      expect(rows.length).toBeLessThanOrEqual(2);
    });

    it("filters by mediaType", async () => {
      await commitFixture("list-video", {
        mimeType: "video/mp4",
        mediaType: MediaType.video,
      });

      const videos = await listMedia({ mediaType: MediaType.video, limit: 100 });

      expect(videos.some((row) => row.storageKey === keyFor("list-video"))).toBe(true);
      for (const row of videos) expect(row.mediaType).toBe(MediaType.video);
    });

    it("does not return a video when filtering for images", async () => {
      const images = await listMedia({ mediaType: MediaType.image, limit: 100 });
      expect(images.some((row) => row.storageKey === keyFor("list-video"))).toBe(false);
    });
  });
});
