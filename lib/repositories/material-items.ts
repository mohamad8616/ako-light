import { cache } from "react";
import { MaterialType, type Prisma } from "@/generated/prisma/client";
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { isMaterialItemPubliclyReady } from "@/lib/data/material-item-readiness";
import { asJsonInput, asLocalized } from "./casting";

export type MaterialItem = {
  id: string;
  slug: string;
  name: Localized;
  image: string;
  sortOrder: number;
};

export type MaterialItemAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  categoryId: string;
  categoryName: Localized;
  image: string | null;
  sortOrder: number;
  isReady: boolean;
};

export type MaterialItemWriteInput = {
  slug: string;
  name: Localized;
  categoryId: string;
  image: string;
  sortOrder: number;
};

function mapReadyItem(row: {
  id: string;
  slug: string;
  name: unknown;
  image: string | null;
  sortOrder: number;
}): MaterialItem | null {
  const candidate = { name: asLocalized(row.name), image: row.image };
  if (!isMaterialItemPubliclyReady(candidate)) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: candidate.name,
    image: candidate.image,
    sortOrder: row.sortOrder,
  };
}

/** Items are intentionally plain display records, not links/detail entities. */
export const getMaterialItems = cache(async (categoryId: string): Promise<MaterialItem[]> => {
  const rows = await prisma.material.findMany({
    where: { categoryId, image: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, name: true, image: true, sortOrder: true },
  });
  return rows.flatMap((row) => {
    const item = mapReadyItem(row);
    return item ? [item] : [];
  });
});

export const getMaterialItemAdminRows = cache(async (): Promise<MaterialItemAdminRow[]> => {
  const rows = await prisma.material.findMany({
    orderBy: [{ materialCategory: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
    include: { materialCategory: { select: { name: true } } },
  });
  return rows.map((row) => {
    const name = asLocalized(row.name);
    return {
      id: row.id,
      slug: row.slug,
      name,
      categoryId: row.categoryId,
      categoryName: asLocalized(row.materialCategory.name),
      image: row.image,
      sortOrder: row.sortOrder,
      isReady: isMaterialItemPubliclyReady({ name, image: row.image }),
    };
  });
});

export const getMaterialItemImageUrls = cache(async (id: string) => {
  const row = await prisma.material.findUnique({
    where: { id },
    select: { image: true },
  });
  return row?.image ? [row.image] : [];
});

export const getMaterialItemParentSlugByLegacySlug = cache(
  async (slug: string): Promise<string | null> => {
    let row = await prisma.material.findUnique({
      where: { slug },
      select: { categoryId: true, materialCategory: { select: { slug: true } } },
    });
    if (!row) {
      const history = await prisma.slugHistory.findUnique({
        where: { modelType_oldSlug: { modelType: "material", oldSlug: slug } },
        select: { entityId: true },
      });
      if (history) {
        row = await prisma.material.findUnique({
          where: { id: history.entityId },
          select: { categoryId: true, materialCategory: { select: { slug: true } } },
        });
      }
    }
    return row?.materialCategory.slug ?? null;
  },
);

export const materialItemSlugTaken = async (
  slug: string,
  exceptId?: string,
): Promise<boolean> => {
  const [item, category] = await Promise.all([
    prisma.material.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    }),
    prisma.materialCategory.findFirst({ where: { slug }, select: { id: true } }),
  ]);
  return Boolean(item || category);
};

async function getCategoryLabel(categoryId: string, db: Prisma.TransactionClient) {
  const category = await db.materialCategory.findUnique({
    where: { id: categoryId },
    select: { name: true },
  });
  if (!category) throw new Error("Material category not found");
  return asLocalized(category.name).en;
}

export const createMaterialItem = async (
  input: MaterialItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  const categoryLabel = await getCategoryLabel(input.categoryId, db);
  const row = await db.material.create({
    data: {
      id: input.slug,
      slug: input.slug,
      name: asJsonInput(input.name),
      category: categoryLabel,
      categoryId: input.categoryId,
      type: MaterialType.fabric,
      image: input.image,
      description: asJsonInput({ en: "", fa: "" }),
      sortOrder: input.sortOrder,
    },
  });
  return row.id;
};

export const updateMaterialItem = async (
  id: string,
  input: MaterialItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const categoryLabel = await getCategoryLabel(input.categoryId, db);
  await db.material.update({
    where: { id },
    data: {
      slug: input.slug,
      name: asJsonInput(input.name),
      category: categoryLabel,
      categoryId: input.categoryId,
      image: input.image,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteMaterialItem = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.material.delete({ where: { id } });
};
