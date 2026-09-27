/**
 * Step 6 — slug collision → clean `slugTaken`, not raw P2002 leak.
 *
 * The existing slug-change-fk.test.ts proves rename-success preserves FKs.
 * This file proves the converse: renaming an entity to a slug that ALREADY
 * exists on another row of the SAME type is rejected with a CLEAR validation
 * error (`slugTaken`), not a raw Postgres unique-constraint violation
 * (P2002) that would leak to the admin UI.
 *
 * Two levels:
 *   1. Repository tier — calls the write fns directly inside a rolled-back
 *      transaction; expects P2002 to be thrown (the repository does NOT catch
 *      it — that's the action's job via `toActionResult`).
 *   2. Action tier — mocks an `admin` session and exercises the REAL server
 *      actions with the colliding slug *inside a rolled-back transaction*
 *      (the actions accept an optional transactional client, matching the
 *      recordSlugChange(..., db = prisma) precedent); expects
 *      `{ok:false, formError:"invalid", issues:[{field, code:"slugTaken"}]}`
 *      and asserts NO P2002 code/message leaks into the result. The rollback
 *      — not a `finally` + `deleteMany` — is what guarantees cleanup: the
 *      previous `finally` pattern leaked a committed row on every 30s timeout
 *      (the cleanup query itself could not run), which is exactly the
 *      fabric_item 11-vs-10 drift and the cross-tier product-count race.
 *
 * Covers one slug-entity (product-category, `field:"slug"`) and one id-entity
 * (fabric, `field:"id"`) to pin both branches of `toActionResult`.
 *
 * Server tier: needs DATABASE_URL (skipIf guard). Every write in this file
 * runs inside a rolled-back transaction, so the dev database is never
 * mutated — even when an assertion fails or the test times out.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  refresh: refreshMock,
}));

import {
  createProductCategory,
  updateProductCategory,
} from "@/lib/repositories/product-categories";
import { createFabricItem } from "@/lib/repositories/fabrics";
import {
  createProductCategoryAction,
  updateProductCategoryAction,
} from "@/lib/admin/actions/product-categories";
import { createProductAction } from "@/lib/admin/actions/products";
import type { ProductFormValues } from "@/lib/admin/schemas/product";
import { createFabricAction } from "@/lib/admin/actions/fabrics";

describeDb("slug collision — repository tier (expects P2002)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("renaming a category to another category's existing slug throws P2002", async () => {
    const suffix = randomUUID();
    const slugA = `cat-a-${suffix}`;
    const slugB = `cat-b-${suffix}`;

    const rollback = new Error("intentional test rollback");

    await expect(
      prisma.$transaction(async (tx) => {
        await createProductCategory(
          { slug: slugA, i18nKey: "products.catA", name: { en: "Cat A", fa: "کت ا" }, sortOrder: 0 },
          tx,
        );
        await createProductCategory(
          { slug: slugB, i18nKey: "products.catB", name: { en: "Cat B", fa: "کت ب" }, sortOrder: 1 },
          tx,
        );

        await expect(
          updateProductCategory(
            slugB,
            { slug: slugA, i18nKey: "products.catB", name: { en: "Cat B", fa: "کت ب" }, sortOrder: 1 },
            tx,
          ),
        ).rejects.toMatchObject({ code: "P2002" });

        throw rollback;
      }, { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toBe(rollback);
  });

  it("creating a fabric with another fabric's existing id throws P2002", async () => {
    const id = `fab-${randomUUID()}`;
    const rollback = new Error("intentional test rollback");

    await expect(
      prisma.$transaction(async (tx) => {
        await createFabricItem(
          { id, name: "Fab A", code: "A1", category: "Test", swatchColor: "#3a3530", sortOrder: 0 },
          tx,
        );

        await expect(
          createFabricItem(
            { id, name: "Fab B", code: "B1", category: "Test", swatchColor: "#726A50", sortOrder: 1 },
            tx,
          ),
        ).rejects.toMatchObject({ code: "P2002" });

        throw rollback;
      }, { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toBe(rollback);
  });
});

describeDb("slug collision — action tier (expects clean slugTaken, no P2002 leak)", () => {
  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { id: { startsWith: "product-collision-" } },
    });
    await prisma.productCategory.deleteMany({
      where: {
        OR: [
          { id: { startsWith: "cat-a-" } },
          { id: { startsWith: "cat-b-" } },
          { id: { startsWith: "cat-product-" } },
        ],
      },
    });
    await prisma.fabricItem.deleteMany({
      where: { id: { startsWith: "fab-" } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }) as never);
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    revalidatePathMock.mockReset();
    refreshMock.mockReset();
  });

  it("updateProductCategoryAction with colliding slug returns slugTaken, no P2002 leak", async () => {
    const suffix = randomUUID();
    const slugA = `cat-a-${suffix}`;
    const slugB = `cat-b-${suffix}`;

    const rollback = new Error("intentional test rollback");

    await expect(
      prisma.$transaction(async (tx) => {
        await createProductCategoryAction(
          {
            slug: slugA,
            i18nKey: `products.catA-${suffix}`,
            name: { en: "Cat A", fa: "کت ا" },
            sortOrder: 0,
          },
          tx,
        );
        await createProductCategoryAction(
          {
            slug: slugB,
            i18nKey: `products.catB-${suffix}`,
            name: { en: "Cat B", fa: "کت ب" },
            sortOrder: 1,
          },
          tx,
        );

        const result = await updateProductCategoryAction(
          slugB,
          {
            slug: slugA,
            i18nKey: `products.catB-${suffix}`,
            name: { en: "Cat B", fa: "کت ب" },
            sortOrder: 1,
          },
          tx,
        );

        expect(result).toEqual({
          ok: false,
          formError: "invalid",
          issues: [{ field: "slug", code: "slugTaken" }],
        });
        expect(JSON.stringify(result)).not.toContain("P2002");

        throw rollback;
      }, { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toBe(rollback);

    // Nothing survived the rollback — the assertion that used to need a
    // `finally` + deleteMany (which leaked on timeout).
    expect(await prisma.productCategory.findUnique({ where: { id: slugA } })).toBeNull();
    expect(await prisma.productCategory.findUnique({ where: { id: slugB } })).toBeNull();
  });

  it("createProductAction with colliding slug returns slugTaken, no P2002 leak", async () => {
    const suffix = randomUUID();
    const categoryId = `cat-product-${suffix}`;
    const productSlug = `product-collision-${suffix}`;

    const rollback = new Error("intentional test rollback");

    const input: ProductFormValues = {
      slug: productSlug,
      name: { en: "Product", fa: "محصول" },
      hoverImage: "/product-hover.jpg",
      heroImage: "/product-hero.jpg",
      price: 10,
      existsInStore: true,
      quantity: 1,
      description: { en: "Description", fa: "توضیح" },
      moreInfo: null,
      downloads: [],
      related: [],
      sortOrder: 0,
      categoryId,
      designerId: null,
      images: [],
    };

    await expect(
      prisma.$transaction(async (tx) => {
        await createProductCategory(
          {
            slug: categoryId,
            i18nKey: `products.product-${suffix}`,
            name: { en: "Product Category", fa: "دسته محصول" },
            sortOrder: 0,
          },
          tx,
        );

        const first = await createProductAction(input, tx);
        expect(first).toEqual({ ok: true, data: productSlug });

        const result = await createProductAction(input, tx);
        // `createProduct` sets `id = slug`, so the collision trips the PRIMARY KEY
        // (id) before the unique slug index — the reported field is therefore
        // "id", which is exactly what `toActionResult` pins for the id branch.
        // (product-category above pins the slug branch.)
        expect(result).toEqual({
          ok: false,
          formError: "invalid",
          issues: [{ field: "id", code: "slugTaken" }],
        });
        expect(JSON.stringify(result)).not.toContain("P2002");

        throw rollback;
      }, { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toBe(rollback);

    expect(await prisma.product.findUnique({ where: { id: productSlug } })).toBeNull();
    expect(await prisma.productCategory.findUnique({ where: { id: categoryId } })).toBeNull();
  });

  it("createFabricAction with colliding id returns slugTaken (field is 'id'), no P2002 leak", async () => {
    const id = `fab-${randomUUID()}`;
    const rollback = new Error("intentional test rollback");

    await expect(
      prisma.$transaction(async (tx) => {
        const first = await createFabricAction(
          {
            id,
            name: "Fab A",
            code: "A1",
            category: "Test",
            swatchColor: "#3a3530",
            sortOrder: 0,
          },
          tx,
        );
        expect(first).toEqual({ ok: true, data: id });

        const result = await createFabricAction(
          {
            id,
            name: "Fab B",
            code: "B1",
            category: "Test",
            swatchColor: "#726A50",
            sortOrder: 1,
          },
          tx,
        );

        expect(result).toEqual({
          ok: false,
          formError: "invalid",
          issues: [{ field: "id", code: "slugTaken" }],
        });
        expect(JSON.stringify(result)).not.toContain("P2002");

        throw rollback;
      }, { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toBe(rollback);

    expect(await prisma.fabricItem.findUnique({ where: { id } })).toBeNull();
  });

});