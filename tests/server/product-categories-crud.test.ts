/**
 * Pass 10.5 — repository tier: write operations for product categories.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createProductCategory,
  deleteProductCategory,
  updateProductCategory,
  type ProductCategoryWriteInput,
} from "@/lib/repositories/product-categories";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeCategoryInput = (overrides: Partial<ProductCategoryWriteInput> = {}): ProductCategoryWriteInput => ({
  slug: `test-category-${randomUUID()}`,
  i18nKey: `products.test-${randomUUID()}`,
  name: { en: "Test Category", fa: "دسته تست" },
  sortOrder: 0,
  ...overrides,
});

describeDb("product-categories repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeCategoryInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProductCategory(input, tx);
        const row = await tx.productCategory.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.i18nKey).toBe(input.i18nKey);
        expect(row!.name).toEqual(input.name);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.productCategory.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeCategoryInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProductCategory(input, tx);

        const updatedInput = makeCategoryInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Category", fa: "دسته بروزرسانی" },
          sortOrder: 5,
          // Not part of this edit: carry the original key through, because
          // updateProductCategory writes every field of its WriteInput (the
          // factory would otherwise mint a fresh uuid i18nKey here).
          i18nKey: input.i18nKey,
        });
        await updateProductCategory(createdId!, updatedInput, tx);

        const row = await tx.productCategory.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // i18nKey should remain from original
        expect(row!.i18nKey).toBe(input.i18nKey);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.productCategory.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeCategoryInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProductCategory(input, tx);
        await deleteProductCategory(createdId!, tx);
        const row = await tx.productCategory.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.productCategory.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});