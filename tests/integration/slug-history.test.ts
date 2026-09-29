import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  getCatalogRedirectPath,
  recordSlugChange,
  updateWithSlugHistory,
  type SlugHistoryDb,
} from "@/lib/repositories/slug-history";
import { hasDatabaseUrl } from "@/tests/helpers/db";

// All writes are rolled back, including when an assertion fails.
describe.skipIf(!hasDatabaseUrl)("slug history", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("resolves an old designer slug by stable id after a rename", async () => {
    const rollback = new Error("intentional test rollback");
    const id = randomUUID();
    const oldSlug = `old-${id}`;
    const newSlug = `new-${id}`;
    await expect(prisma.$transaction(async (tx) => {
      await tx.designer.create({
        data: { id, slug: oldSlug, name: { en: "Test", fa: "Test" }, image: "/test.jpg", bio: [] },
      });
      await recordSlugChange("designer", id, oldSlug, tx);
      // History recorded before the mutation must not cause a self-redirect.
      expect(await getCatalogRedirectPath("designer", oldSlug, undefined, tx)).toBeNull();
      await tx.designer.update({ where: { id }, data: { slug: newSlug } });
      expect(await tx.designer.findUnique({ where: { slug: oldSlug } })).toBeNull();
      expect(await getCatalogRedirectPath("designer", oldSlug, undefined, tx))
        .toBe(`/designers/${newSlug}`);
      expect(await getCatalogRedirectPath("designer", newSlug, undefined, tx)).toBeNull();
      throw rollback;
    }, { maxWait: 20_000, timeout: 20_000 })).rejects.toBe(rollback);
    expect(await prisma.designer.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.slugHistory.count({ where: { entityId: id } })).toBe(0);
  });

  it("redirects a renamed product route resolved entirely through ids", async () => {
    // id != slug for both rows, so nothing here can succeed by treating the
    // FK column (Product.categoryId) as a slug.
    const rollback = new Error("intentional test rollback");
    const categoryId = randomUUID();
    const oldCategorySlug = `old-cat-${categoryId}`;
    const newCategorySlug = `new-cat-${categoryId}`;
    const productId = randomUUID();
    const oldProductSlug = `old-prod-${productId}`;
    const newProductSlug = `new-prod-${productId}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.productCategory.create({
            data: {
              id: categoryId,
              slug: oldCategorySlug,
              i18nKey: "products.test",
              name: { en: "Test", fa: "Test" },
            },
          });
          await tx.product.create({
            data: {
              id: productId,
              slug: oldProductSlug,
              name: { en: "Test", fa: "Test" },
              hoverImage: "/test.jpg",
              priceEur: 1,
              priceToman: 50_000,
              heroImage: "/test.jpg",
              description: { en: "Test", fa: "Test" },
              downloads: [],
              related: [],
              categoryId,
            },
          });

          await recordSlugChange("productCategory", categoryId, oldCategorySlug, tx);
          await recordSlugChange("product", productId, oldProductSlug, tx);
          await tx.productCategory.update({
            where: { id: categoryId },
            data: { slug: newCategorySlug },
          });
          await tx.product.update({
            where: { id: productId },
            data: { slug: newProductSlug },
          });

          // Both historical segments resolve to the current URL.
          expect(
            await getCatalogRedirectPath(
              "product",
              oldProductSlug,
              oldCategorySlug,
              tx,
            ),
          ).toBe(`/products/${newCategorySlug}/${newProductSlug}`);

          // The current URL never self-redirects.
          expect(
            await getCatalogRedirectPath(
              "product",
              newProductSlug,
              newCategorySlug,
              tx,
            ),
          ).toBeNull();

          // A category the product does not belong to is never used as the
          // redirect target (ownership is compared by id, not slug).
          const other = await tx.productCategory.findFirstOrThrow({
            where: { id: { not: categoryId } },
            select: { slug: true },
          });
          expect(
            await getCatalogRedirectPath(
              "product",
              oldProductSlug,
              other.slug,
              tx,
            ),
            "historical product under a foreign category",
          ).toBeNull();

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);

    expect(
      await prisma.product.findUnique({ where: { id: productId } }),
    ).toBeNull();
    expect(
      await prisma.productCategory.findUnique({ where: { id: categoryId } }),
    ).toBeNull();
    expect(
      await prisma.slugHistory.count({ where: { entityId: productId } }),
    ).toBe(0);
  });

  // -------------------------------------------------------------------------
  // `updateWithSlugHistory` — the helper every catalog update action now goes
  // through. These four cases are the contract the plan asks for: changed,
  // unchanged, chained, and failed.
  // -------------------------------------------------------------------------

  it("records the old slug and applies the rename through updateWithSlugHistory", async () => {
    const rollback = new Error("intentional test rollback");
    const id = randomUUID();
    const oldSlug = `a-${id}`;
    const newSlug = `b-${id}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.collection.create({
            data: {
              id,
              slug: oldSlug,
              name: { en: "Test", fa: "Test" },
              year: "2026",
              image: "/test.jpg",
              description: {
                p1: { en: "a", fa: "a" },
                p2: { en: "b", fa: "b" },
                p3: { en: "c", fa: "c" },
              },
            },
          });

          const previous = await updateWithSlugHistory(
            "collection",
            id,
            newSlug,
            async (inner) => {
              await inner.collection.update({
                where: { id },
                data: { slug: newSlug },
              });
            },
            { db: tx },
          );

          expect(previous).toBe(oldSlug);

          // Entity moved to the new slug …
          const row = await tx.collection.findUniqueOrThrow({ where: { id } });
          expect(row.slug).toBe(newSlug);

          // … and A→B is recorded.
          const history = await tx.slugHistory.findMany({
            where: { entityId: id, modelType: "collection" },
          });
          expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);

          // The old URL now resolves to the current one (no self-redirect).
          expect(
            await getCatalogRedirectPath("collection", oldSlug, undefined, tx),
          ).toBe(`/collections/${newSlug}`);
          expect(
            await getCatalogRedirectPath("collection", newSlug, undefined, tx),
          ).toBeNull();

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);

    expect(await prisma.collection.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.slugHistory.count({ where: { entityId: id } })).toBe(0);
  });

  it("does not create a history record when the slug is unchanged", async () => {
    const rollback = new Error("intentional test rollback");
    const id = randomUUID();
    const slug = `same-${id}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.material.create({
            data: {
              id,
              slug,
              name: { en: "Test", fa: "Test" },
              category: "stone",
              type: "stone",
              image: "/test.jpg",
              description: { en: "Test", fa: "Test" },
            },
          });

          let writeRan = false;
          const previous = await updateWithSlugHistory(
            "material",
            id,
            slug,
            async (inner) => {
              writeRan = true;
              // A no-op slug write still has to leave the row alone.
              await inner.material.update({ where: { id }, data: { slug } });
            },
            { db: tx },
          );

          expect(previous, "A→A must not report a rename").toBeNull();
          expect(writeRan, "the update still runs on a no-op rename").toBe(true);
          expect(
            await tx.slugHistory.count({ where: { entityId: id } }),
            "A→A must not write history",
          ).toBe(0);

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);
  });

  it("keeps every historical slug resolvable across a chained rename", async () => {
    const rollback = new Error("intentional test rollback");
    const id = randomUUID();
    const a = `chain-a-${id}`;
    const b = `chain-b-${id}`;
    const c = `chain-c-${id}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.project.create({
            data: {
              id,
              slug: a,
              i18nKey: "projects.test",
              name: { en: "Test", fa: "Test" },
              location: "Tehran",
              year: "2026",
              image: "/test.jpg",
              description: { en: "Test", fa: "Test" },
              paragraph: { en: "Test", fa: "Test" },
              moreDescription: { en: "Test", fa: "Test" },
              credits: [],
              portfolioImages: [],
            },
          });

          const write =
            (slug: string) => async (inner: SlugHistoryDb) => {
              await inner.project.update({ where: { id }, data: { slug } });
            };

          // A → B
          expect(
            await updateWithSlugHistory("project", id, b, write(b), { db: tx }),
          ).toBe(a);
          // B → C
          expect(
            await updateWithSlugHistory("project", id, c, write(c), { db: tx }),
          ).toBe(b);

          const history = await tx.slugHistory.findMany({
            where: { entityId: id, modelType: "project" },
            orderBy: { createdAt: "asc" },
          });
          // Both historical slugs survive — ordered by when they were retired.
          expect(history.map((h) => h.oldSlug).sort()).toEqual([a, b].sort());

          // Either old URL still lands on the current slug.
          expect(
            await getCatalogRedirectPath("project", a, undefined, tx),
          ).toBe(`/projects/${c}`);
          expect(
            await getCatalogRedirectPath("project", b, undefined, tx),
          ).toBe(`/projects/${c}`);
          // The current URL never self-redirects.
          expect(
            await getCatalogRedirectPath("project", c, undefined, tx),
          ).toBeNull();

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);
  });

  it("leaves no orphaned history row when the entity update fails", async () => {
    // Deliberately NOT wrapped in the thrown-rollback harness: this case has to
    // observe state AFTER the failure, and a Postgres transaction aborts on the
    // first error (25P02), so any follow-up query inside the same `tx` would
    // itself throw and hide the real result. The rows are committed and then
    // deleted in `finally`.
    const id = randomUUID();
    const oldSlug = `kept-${id}`;
    const newSlug = `taken-${id}`;

    await prisma.designer.create({
      data: {
        id,
        slug: oldSlug,
        name: { en: "Test", fa: "Test" },
        image: "/test.jpg",
        bio: [],
      },
    });
    // Another row already owns the slug we are about to rename onto.
    await prisma.designer.create({
      data: {
        id: randomUUID(),
        slug: newSlug,
        name: { en: "Other", fa: "Other" },
        image: "/test.jpg",
        bio: [],
      },
    });

    try {
      // The write throws AFTER the history row was inserted, because the new
      // slug collides with the other row's unique index entry.
      await expect(
        updateWithSlugHistory("designer", id, newSlug, async (inner) => {
          await inner.designer.update({
            where: { id },
            data: { slug: newSlug },
          });
        }),
      ).rejects.toThrow();

      // The whole transaction rolled back: no history row ...
      expect(
        await prisma.slugHistory.count({ where: { entityId: id } }),
        "a failed update must not leave an orphaned history row",
      ).toBe(0);
      // ... and the entity keeps its original slug.
      expect(
        (await prisma.designer.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(oldSlug);
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.designer.deleteMany({
        where: { slug: { in: [oldSlug, newSlug] } },
      });
    }
  });

  it("still enforces slug uniqueness on update", async () => {
    // Committed then cleaned up in `finally`: the aborted transaction state
    // that follows the expected violation would break any assertion inside it.
    const id = randomUUID();
    const taken = `taken-${id}`;
    const free = `free-${id}`;

    const description = {
      p1: { en: "a", fa: "a" },
      p2: { en: "b", fa: "b" },
      p3: { en: "c", fa: "c" },
    };

    await prisma.collection.create({
      data: {
        id: randomUUID(),
        slug: taken,
        name: { en: "Taken", fa: "Taken" },
        year: "2026",
        image: "/test.jpg",
        description,
      },
    });
    await prisma.collection.create({
      data: {
        id,
        slug: free,
        name: { en: "Free", fa: "Free" },
        year: "2026",
        image: "/test.jpg",
        description,
      },
    });

    try {
      // Renaming onto an in-use slug is still a violation — the helper does
      // not weaken the entity's own unique index.
      await expect(
        updateWithSlugHistory("collection", id, taken, async (inner) => {
          await inner.collection.update({
            where: { id },
            data: { slug: taken },
          });
        }),
      ).rejects.toThrow();

      // Rolled back: the row never moved and no history row was left behind.
      expect(
        (await prisma.collection.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(free);
      expect(await prisma.slugHistory.count({ where: { entityId: id } })).toBe(
        0,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.collection.deleteMany({
        where: { slug: { in: [taken, free] } },
      });
    }
  });

  it("re-renaming to a previously used slug does not throw a unique violation", async () => {
    // A→B→A→B: the second time `A` is retired, the row for (collection, A)
    // already exists. `recordSlugChange` upserts instead of inserting, so the
    // chain completes rather than failing on the @@unique index.
    const rollback = new Error("intentional test rollback");
    const id = randomUUID();
    const a = `re-a-${id}`;
    const b = `re-b-${id}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.collection.create({
            data: {
              id,
              slug: a,
              name: { en: "Test", fa: "Test" },
              year: "2026",
              image: "/test.jpg",
              description: {
                p1: { en: "a", fa: "a" },
                p2: { en: "b", fa: "b" },
                p3: { en: "c", fa: "c" },
              },
            },
          });

          const write = (slug: string) => async (inner: SlugHistoryDb) => {
            await inner.collection.update({ where: { id }, data: { slug } });
          };
          await updateWithSlugHistory("collection", id, b, write(b), { db: tx });
          await updateWithSlugHistory("collection", id, a, write(a), { db: tx });
          // Retiring `a` a second time is the case that used to throw.
          await updateWithSlugHistory("collection", id, b, write(b), { db: tx });

          const history = await tx.slugHistory.findMany({
            where: { entityId: id, modelType: "collection" },
          });
          // One row per distinct historical slug — no duplicates.
          expect(history.map((h) => h.oldSlug).sort()).toEqual([a, b].sort());
          expect(
            (await tx.collection.findUniqueOrThrow({ where: { id } })).slug,
          ).toBe(b);

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);
  });
});
