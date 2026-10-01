/**
 * Pass 12.5B — action tier: every slug-bearing catalog UPDATE action records
 * its old slug in `slug_history`.
 *
 * Why this file exists: tests/integration/slug-history.test.ts proves the
 * `updateWithSlugHistory` HELPER is correct, and tests/server/slug-change-fk.test.ts
 * proves a rename is a non-event for id-based FKs. Neither calls an admin server
 * action. That left the plan's actual deliverable — "connect the existing
 * infrastructure to the relevant update actions" — unproven: an action could
 * drop its `updateWithSlugHistory` wrapper and the whole suite would stay green.
 *
 * This suite drives the REAL exported actions (the functions the dashboard forms
 * submit to) against the real dev database and asserts the observable contract:
 *
 *   1. a rename writes a slug_history row AND moves the entity      (A → B)
 *   2. an unchanged slug writes nothing                             (A → A)
 *   3. a chained rename keeps every historical slug resolvable      (A → B → C)
 *   4. a failed update leaves no orphaned history row
 *
 * ISOLATION: only products / productCategories / fabrics accept an optional
 * `db`; the remaining actions call `updateWithSlugHistory` with no `db`, which
 * opens its OWN `prisma.$transaction`. An outer rollback transaction therefore
 * cannot contain their writes (the inner transaction commits independently).
 * Following the established pattern in tests/integration/slug-history.test.ts,
 * every row this suite writes is committed and then removed in `finally`, so the
 * seeded dev database is left exactly as it was found.
 *
 * Auth is mocked (the action's own authorization is covered by
 * tests/unit/admin/actions/no-session-denied.test.ts); everything below it —
 * schema parse, repository write, transaction, history write — is production code.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

// Authorize every call: this suite is about slug history, not access control.
vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: { getSession: vi.fn().mockResolvedValue({ user: { role: "admin" } }) },
  },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));
// `revalidatePath`/`refresh` cover the revalidation calls; `unstable_cache` and
// `updateTag` are required for the modules under test to LOAD at all —
// `lib/repositories/product-categories.ts` calls `unstable_cache` at module
// scope, and `lib/admin/revalidate.ts` reads `updateTag` on a categories
// mutation (this suite drives `updateProductCategoryAction`). Vitest's mock
// factory is a namespace proxy, so an absent export throws at import time and
// fails the whole file. The `unstable_cache` passthrough returns the inner
// function un-cached, which is correct here: this suite asserts slug history,
// not memoization.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  refresh: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

import { prisma } from "@/lib/db/prisma";
import { getCatalogRedirectPath } from "@/lib/repositories/slug-history";
import { hasDatabaseUrl } from "@/tests/helpers/db";

import { updateCollectionAction } from "@/lib/admin/actions/collections";
import { updateDesignerAction } from "@/lib/admin/actions/designers";
import { updateFlagshipAction } from "@/lib/admin/actions/flagships";
import { updateMaterialAction } from "@/lib/admin/actions/materials";
import { updateProductCategoryAction } from "@/lib/admin/actions/product-categories";
import { updateProductAction } from "@/lib/admin/actions/products";
import { updateProjectAction } from "@/lib/admin/actions/projects";

const describeDb = describe.skipIf(!hasDatabaseUrl);

/** Localized pair used by every form below. */
const PAIR = { en: "Test", fa: "تست" };

/** Ids touched by the suite, so `afterAll` can guarantee a clean database. */
const createdDesignerIds: string[] = [];
const createdDesignerSlugs: string[] = [];

describeDb("slug history — recorded by the real admin update actions", () => {
  afterAll(async () => {
    // Belt-and-braces: each test's `finally` already cleans up. This catches a
    // failure thrown before a `finally` could run.
    await prisma.slugHistory.deleteMany({
      where: { entityId: { in: createdDesignerIds } },
    });
    await prisma.designer.deleteMany({
      where: { slug: { in: createdDesignerSlugs } },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Every slug-bearing entity records A → B through its own update action.
  //    Rows are removed in `finally` (see the module header for why).
  // ---------------------------------------------------------------------------

  it("product: update action records the old slug and applies the rename", async () => {
    const s = randomUUID();
    const catId = `act-cat-${s}`;
    const catSlug = `act-cat-${s}`;
    const id = `act-prod-${s}`;
    const oldSlug = `act-old-prod-${s}`;
    const newSlug = `act-new-prod-${s}`;
    try {
      await prisma.productCategory.create({
        data: {
          id: catId,
          slug: catSlug,
          i18nKey: `products.act-${s}`,
          name: PAIR,
        },
      });
      await prisma.product.create({
        data: {
          id,
          slug: oldSlug,
          name: PAIR,
          hoverImage: "/t.jpg",
          heroImage: "/t.jpg",
          priceEur: 1,
          priceToman: 50_000,
          description: PAIR,
          downloads: [],
          related: [],
          categoryId: catId,
        },
      });

      const result = await updateProductAction(id, {
        slug: newSlug,
        name: PAIR,
        hoverImage: "/t.jpg",
        heroImage: "/t.jpg",
        priceEur: 1,
        priceToman: 50_000,
        existsInStore: true,
        quantity: 1,
        description: PAIR,
        moreInfo: null,
        downloads: [],
        related: [],
        sortOrder: 0,
        categoryId: catId,
        designerId: null,
        images: [],
      });
      expect(result.ok, "action should succeed").toBe(true);

      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "product" },
      });
      expect(
        history.map((h) => h.oldSlug),
        "A → B recorded",
      ).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("product", oldSlug, catSlug)).toBe(
        `/products/${catSlug}/${newSlug}`,
      );
      expect(
        await getCatalogRedirectPath("product", newSlug, catSlug),
      ).toBeNull();
    } finally {
      await prisma.slugHistory.deleteMany({
        where: { entityId: { in: [id, catId] } },
      });
      await prisma.product.deleteMany({ where: { id } });
      await prisma.productCategory.deleteMany({ where: { id: catId } });
    }
  });

  it("productCategory: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-cat2-${s}`;
    const oldSlug = `act-old-cat-${s}`;
    const newSlug = `act-new-cat-${s}`;
    try {
      await prisma.productCategory.create({
        data: { id, slug: oldSlug, i18nKey: `products.c2-${s}`, name: PAIR },
      });

      const result = await updateProductCategoryAction(id, {
        slug: newSlug,
        i18nKey: `products.c2-${s}`,
        name: PAIR,
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.productCategory.findUniqueOrThrow({ where: { id } }))
          .slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "productCategory" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("productCategory", oldSlug)).toBe(
        `/products/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.productCategory.deleteMany({ where: { id } });
    }
  });

  it("designer: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-des-${s}`;
    const oldSlug = `act-old-des-${s}`;
    const newSlug = `act-new-des-${s}`;
    createdDesignerIds.push(id);
    createdDesignerSlugs.push(oldSlug, newSlug);
    try {
      await prisma.designer.create({
        data: { id, slug: oldSlug, name: PAIR, image: "/t.jpg", bio: [] },
      });

      const result = await updateDesignerAction(id, {
        slug: newSlug,
        name: PAIR,
        image: "/t.jpg",
        website: null,
        bio: [],
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.designer.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "designer" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("designer", oldSlug)).toBe(
        `/designers/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.designer.deleteMany({ where: { id } });
    }
  });

  it("collection: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-col-${s}`;
    const oldSlug = `act-old-col-${s}`;
    const newSlug = `act-new-col-${s}`;
    const description = { p1: PAIR, p2: PAIR, p3: PAIR };
    try {
      await prisma.collection.create({
        data: {
          id,
          slug: oldSlug,
          name: PAIR,
          year: "2026",
          image: "/t.jpg",
          description,
        },
      });

      const result = await updateCollectionAction(id, {
        slug: newSlug,
        name: PAIR,
        year: "2026",
        image: "/t.jpg",
        description,
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.collection.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "collection" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("collection", oldSlug)).toBe(
        `/collections/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.collection.deleteMany({ where: { id } });
    }
  });

  it("material: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-mat-${s}`;
    const oldSlug = `act-old-mat-${s}`;
    const newSlug = `act-new-mat-${s}`;
    try {
      await prisma.material.create({
        data: {
          id,
          slug: oldSlug,
          name: PAIR,
          category: "stone",
          type: "stone",
          image: "/t.jpg",
          description: PAIR,
        },
      });

      const result = await updateMaterialAction(id, {
        slug: newSlug,
        name: PAIR,
        category: "stone",
        type: "stone",
        image: "/t.jpg",
        description: PAIR,
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.material.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "material" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("material", oldSlug)).toBe(
        `/materials/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.material.deleteMany({ where: { id } });
    }
  });

  it("flagship: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-fla-${s}`;
    const oldSlug = `act-old-fla-${s}`;
    const newSlug = `act-new-fla-${s}`;
    try {
      await prisma.flagship.create({
        data: {
          id,
          slug: oldSlug,
          name: PAIR,
          city: PAIR,
          image: "/t.jpg",
          sortOrder: 0,
        },
      });

      const result = await updateFlagshipAction(id, {
        slug: newSlug,
        name: PAIR,
        city: PAIR,
        image: "/t.jpg",
        detail: null,
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.flagship.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "flagship" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("flagship", oldSlug)).toBe(
        `/flagship/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.flagship.deleteMany({ where: { id } });
    }
  });

  it("project: update action records the old slug", async () => {
    const s = randomUUID();
    const id = `act-proj-${s}`;
    const oldSlug = `act-old-proj-${s}`;
    const newSlug = `act-new-proj-${s}`;
    try {
      await prisma.project.create({
        data: {
          id,
          slug: oldSlug,
          i18nKey: `projects.act-${s}`,
          name: PAIR,
          location: "Tehran",
          year: "2026",
          image: "/t.jpg",
          description: PAIR,
          paragraph: PAIR,
          moreDescription: [],
          credits: [],
          portfolioImages: [],
        },
      });

      const result = await updateProjectAction(id, {
        slug: newSlug,
        i18nKey: `projects.act-${s}`,
        name: PAIR,
        location: "Tehran",
        year: "2026",
        image: "/t.jpg",
        description: PAIR,
        paragraph: PAIR,
        moreDescription: [],
        credits: [],
        portfolioImages: [],
        sortOrder: 0,
        productIds: [],
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.project.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(newSlug);
      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "project" },
      });
      expect(history.map((h) => h.oldSlug)).toEqual([oldSlug]);
      expect(await getCatalogRedirectPath("project", oldSlug)).toBe(
        `/projects/${newSlug}`,
      );
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.project.deleteMany({ where: { id } });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. A → A writes no history row through the action.
  // ---------------------------------------------------------------------------

  it("unchanged slug: the action writes no history row", async () => {
    const s = randomUUID();
    const id = `act-same-${s}`;
    const slug = `act-same-${s}`;
    try {
      await prisma.designer.create({
        data: { id, slug, name: PAIR, image: "/t.jpg", bio: [] },
      });

      // Same slug as the stored row — the rename is a no-op for history, but the
      // rest of the update must still apply.
      const result = await updateDesignerAction(id, {
        slug,
        name: { en: "Renamed", fa: "تست" },
        image: "/t.jpg",
        website: null,
        bio: [],
        sortOrder: 0,
      });
      expect(result.ok).toBe(true);

      expect(
        (await prisma.designer.findUniqueOrThrow({ where: { id } })).name,
        "the non-slug fields still applied",
      ).toEqual({ en: "Renamed", fa: "تست" });
      expect(
        await prisma.slugHistory.count({ where: { entityId: id } }),
        "A → A must not write history",
      ).toBe(0);
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.designer.deleteMany({ where: { id } });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Chained renames through the action keep every historical slug resolvable.
  // ---------------------------------------------------------------------------

  it("multiple changes: A → B → C keeps both historical slugs resolvable", async () => {
    const s = randomUUID();
    const id = `act-chain-${s}`;
    const a = `act-chain-a-${s}`;
    const b = `act-chain-b-${s}`;
    const c = `act-chain-c-${s}`;
    try {
      await prisma.collection.create({
        data: {
          id,
          slug: a,
          name: PAIR,
          year: "2026",
          image: "/t.jpg",
          description: { p1: PAIR, p2: PAIR, p3: PAIR },
        },
      });

      const input = (slug: string) => ({
        slug,
        name: PAIR,
        year: "2026",
        image: "/t.jpg",
        description: { p1: PAIR, p2: PAIR, p3: PAIR },
        sortOrder: 0,
      });

      expect((await updateCollectionAction(id, input(b))).ok).toBe(true);
      expect((await updateCollectionAction(id, input(c))).ok).toBe(true);

      const history = await prisma.slugHistory.findMany({
        where: { entityId: id, modelType: "collection" },
      });
      // Both retired slugs survive, with no duplicates.
      expect(history.map((h) => h.oldSlug).sort()).toEqual([a, b].sort());

      expect(
        (await prisma.collection.findUniqueOrThrow({ where: { id } })).slug,
      ).toBe(c);
      // Either old URL still lands on the current slug.
      expect(await getCatalogRedirectPath("collection", a)).toBe(
        `/collections/${c}`,
      );
      expect(await getCatalogRedirectPath("collection", b)).toBe(
        `/collections/${c}`,
      );
      // The current URL never self-redirects.
      expect(await getCatalogRedirectPath("collection", c)).toBeNull();
    } finally {
      await prisma.slugHistory.deleteMany({ where: { entityId: id } });
      await prisma.collection.deleteMany({ where: { id } });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. A failed update leaves no orphaned history row (atomicity through the
  //    action, not just the helper).
  // ---------------------------------------------------------------------------

  it("failed update: the action leaves no orphaned history row", async () => {
    const s = randomUUID();
    const id = `act-fail-${s}`;
    const otherId = `act-other-${s}`;
    const oldSlug = `act-fail-old-${s}`;
    const taken = `act-fail-taken-${s}`;
    createdDesignerIds.push(id, otherId);
    createdDesignerSlugs.push(oldSlug, taken);

    // Committed, then removed in `finally`: an aborted transaction (25P02) would
    // make any in-transaction assertion after the failure throw and mask the
    // real result.
    await prisma.designer.create({
      data: { id, slug: oldSlug, name: PAIR, image: "/t.jpg", bio: [] },
    });
    await prisma.designer.create({
      data: {
        id: otherId,
        slug: taken,
        name: { en: "Other", fa: "دیگر" },
        image: "/t.jpg",
        bio: [],
      },
    });

    try {
      // `taken` belongs to another row → the update violates the unique index
      // AFTER the history row was written, so the transaction must roll back.
      const result = await updateDesignerAction(id, {
        slug: taken,
        name: PAIR,
        image: "/t.jpg",
        website: null,
        bio: [],
        sortOrder: 0,
      });
      expect(result.ok, "a colliding slug must not report success").toBe(false);

      expect(
        await prisma.slugHistory.count({ where: { entityId: id } }),
        "a failed action must not leave an orphaned history row",
      ).toBe(0);
      expect(
        (await prisma.designer.findUniqueOrThrow({ where: { id } })).slug,
        "the entity keeps its original slug",
      ).toBe(oldSlug);
    } finally {
      await prisma.slugHistory.deleteMany({
        where: { entityId: { in: [id, otherId] } },
      });
      await prisma.designer.deleteMany({
        where: { id: { in: [id, otherId] } },
      });
    }
  });
});
