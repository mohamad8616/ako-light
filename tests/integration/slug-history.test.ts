import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getCatalogRedirectPath, recordSlugChange } from "@/lib/repositories/slug-history";
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
              price: 1,
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
});
