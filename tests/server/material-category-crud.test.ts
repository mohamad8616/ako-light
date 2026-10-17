import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { TX_OPTIONS } from "@/tests/helpers/tx";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import {
  createMaterialCategory,
  deleteMaterialCategory,
  updateMaterialCategory,
  type MaterialCategoryWriteInput,
} from "@/lib/repositories/material-categories";
import {
  createMaterialItem,
  deleteMaterialItem,
  updateMaterialItem,
  type MaterialItemWriteInput,
} from "@/lib/repositories/material-items";

const describeDb = describe.skipIf(!hasDatabaseUrl);
const categoryInput = (suffix: string): MaterialCategoryWriteInput => ({
  slug: `material-category-${suffix}`,
  name: { en: `Category ${suffix}`, fa: `گروه ${suffix}` },
  image: `/materials/category-${suffix}.jpg`,
  sortOrder: 0,
});
const itemInput = (suffix: string, categoryId: string): MaterialItemWriteInput => ({
  slug: `material-item-${suffix}`,
  name: { en: `Item ${suffix}`, fa: `آیتم ${suffix}` },
  categoryId,
  image: `/materials/item-${suffix}.jpg`,
  code: "",
  swatchColor: "",
  sortOrder: 0,
});

const ROLLBACK = "intentional material transaction rollback";

describeDb("material categories and items repository", () => {
  afterAll(async () => prisma.$disconnect());

  it("creates groups, binds items by group id, filters public items, and preserves fabric metadata", async () => {
    const suffix = randomUUID().slice(0, 8);
    await expect(prisma.$transaction(async (tx) => {
      const categoryId = await createMaterialCategory(categoryInput(suffix), tx);
      expect(await tx.materialCategory.findUnique({ where: { id: categoryId } })).not.toBeNull();
      const input = { ...itemInput(suffix, categoryId), code: "L-01", swatchColor: "#726A50" };
      const itemId = await createMaterialItem(input, tx);
      const row = await tx.material.findUniqueOrThrow({ where: { id: itemId } });
      expect(row.categoryId).toBe(categoryId);
      expect(row.code).toBe("L-01");
      expect(row.swatchColor).toBe("#726A50");

      await updateMaterialItem(itemId, { ...input, name: { en: "Updated", fa: "به‌روزشده" } }, tx);
      expect((await tx.material.findUniqueOrThrow({ where: { id: itemId } })).name).toEqual({ en: "Updated", fa: "به‌روزشده" });

      await deleteMaterialItem(itemId, tx);
      await updateMaterialCategory(categoryId, { ...categoryInput(suffix), name: { en: "Changed", fa: "تغییر" } }, tx);
      expect((await tx.materialCategory.findUniqueOrThrow({ where: { id: categoryId } })).name).toEqual({ en: "Changed", fa: "تغییر" });
      await deleteMaterialCategory(categoryId, tx);
      throw new Error(ROLLBACK);
    }, TX_OPTIONS)).rejects.toThrow(ROLLBACK);
  });
});
