/**
 * Pass 12 — catalog FK migration: referential integrity is enforced on `id`.
 *
 * With every seeded row having `id == slug`, the FK *values* in the database
 * cannot distinguish the old slug-target convention from the new id-target
 * one; only the constraint definition can (asserted read-only in
 * `tests/integration/schema.test.ts`). This file proves the same thing at
 * runtime by creating a deliberately mismatched `id` / `slug` pair and
 * checking which of the two the database accepts into an FK column.
 *
 * Every write happens inside a transaction that is rolled back, including when
 * an assertion fails, so the dev database is never mutated.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasDatabaseUrl } from "@/tests/helpers/db";

describe.skipIf(!hasDatabaseUrl)("catalog foreign keys (id-based)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepts the parent's id in a child FK and rejects its slug", async () => {
    const rollback = new Error("intentional test rollback");
    const productId = randomUUID();
    // Deliberately different from productId, so the two conventions are
    // distinguishable: pre-migration the FK column held this slug.
    const productSlug = `prod-${productId}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          const category = await tx.productCategory.findFirstOrThrow({
            select: { id: true },
          });

          await tx.product.create({
            data: {
              id: productId,
              slug: productSlug,
              name: { en: "Test", fa: "Test" },
              hoverImage: "/test.jpg",
              price: 1,
              heroImage: "/test.jpg",
              description: { en: "Test", fa: "Test" },
              downloads: [],
              related: [],
              // FK column carries ProductCategory.id, never its slug.
              categoryId: category.id,
            },
          });

          // The product's `id` satisfies ProductImage.productId …
          const image = await tx.productImage.create({
            data: { id: randomUUID(), productId, url: "/test.jpg" },
          });
          expect(image.productId).toBe(productId);

          // … its `slug` does not, because it is not a Product.id. The
          // statement fails and aborts the transaction, so it must be the last
          // write in this block.
          await expect(
            tx.productImage.create({
              data: {
                id: randomUUID(),
                productId: productSlug,
                url: "/test.jpg",
              },
            }),
          ).rejects.toThrow(/foreign key/i);

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);

    // Nothing survived the rollback.
    expect(await prisma.product.findUnique({ where: { id: productId } })).toBeNull();
    expect(
      await prisma.productImage.count({ where: { productId: productSlug } }),
    ).toBe(0);
  });

  it("keeps a valid id-based FK usable through the Prisma relation", async () => {
    const rollback = new Error("intentional test rollback");
    const categoryId = randomUUID();
    const categorySlug = `cat-${categoryId}`;
    const productId = randomUUID();
    const productSlug = `prod-${productId}`;

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.productCategory.create({
            data: {
              id: categoryId,
              slug: categorySlug,
              i18nKey: "products.test",
              name: { en: "Test", fa: "Test" },
            },
          });
          await tx.product.create({
            data: {
              id: productId,
              slug: productSlug,
              name: { en: "Test", fa: "Test" },
              hoverImage: "/test.jpg",
              price: 1,
              heroImage: "/test.jpg",
              description: { en: "Test", fa: "Test" },
              downloads: [],
              related: [],
              categoryId,
            },
          });

          // The relation resolves by id even though id != slug …
          const row = await tx.product.findUniqueOrThrow({
            where: { slug: productSlug },
            include: { category: { select: { id: true, slug: true } } },
          });
          expect(row.categoryId).toBe(categoryId);
          expect(row.category.id).toBe(categoryId);
          expect(row.category.slug).toBe(categorySlug);

          // … and the parent can be renamed without touching the child row.
          const renamed = `renamed-${categoryId}`;
          await tx.productCategory.update({
            where: { id: categoryId },
            data: { slug: renamed },
          });
          const after = await tx.product.findUniqueOrThrow({
            where: { id: productId },
            include: { category: { select: { slug: true } } },
          });
          expect(after.categoryId, "FK value survives a parent rename").toBe(
            categoryId,
          );
          expect(after.category.slug).toBe(renamed);

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);

    expect(await prisma.productCategory.findUnique({ where: { id: categoryId } })).toBeNull();
    expect(await prisma.product.findUnique({ where: { id: productId } })).toBeNull();
  });
});
