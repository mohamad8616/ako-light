import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { asJsonInput, asLocalized } from "./casting";

export type MaterialCategory = {
  id: string;
  slug: string;
  name: Localized;
  image: string;
  sortOrder: number;
};

export type MaterialCategoryAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  image: string | null;
  sortOrder: number;
  itemCount: number;
};

export type MaterialCategoryWriteInput = {
  slug: string;
  name: Localized;
  image: string;
  sortOrder: number;
};

export const getMaterialCategory = cache(
  async (slug: string): Promise<MaterialCategory | null> => {
    const row = await prisma.materialCategory.findUnique({ where: { slug } });
    if (!row || !row.image) return null;
    const name = asLocalized(row.name);
    if (!name.en.trim() || !name.fa.trim()) return null;
    return {
      id: row.id,
      slug: row.slug,
      name,
      image: row.image,
      sortOrder: row.sortOrder,
    };
  },
);

/** Publicly ready groups only: both labels and a real group image are required. */
export const getMaterialCategories = cache(async (): Promise<MaterialCategory[]> => {
  const rows = await prisma.materialCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.flatMap((row) => {
    const name = asLocalized(row.name);
    if (!row.image || !name.en.trim() || !name.fa.trim()) return [];
    return [{
      id: row.id,
      slug: row.slug,
      name,
      image: row.image,
      sortOrder: row.sortOrder,
    }];
  });
});

export const getMaterialCategoryAdminRows = cache(
  async (): Promise<MaterialCategoryAdminRow[]> => {
    const rows = await prisma.materialCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { _count: { select: { items: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      image: row.image,
      sortOrder: row.sortOrder,
      itemCount: row._count.items,
    }));
  },
);

export const getMaterialCategoryOptions = cache(async () => {
  const rows = await prisma.materialCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  return rows.map((row) => ({ id: row.id, name: asLocalized(row.name) }));
});

export const getMaterialCategoryItemCount = async (id: string): Promise<number> =>
  prisma.material.count({ where: { categoryId: id } });

export const getMaterialCategoryImageUrls = cache(async (id: string) => {
  const row = await prisma.materialCategory.findUnique({
    where: { id },
    select: { image: true },
  });
  return row?.image ? [row.image] : [];
});

export const materialCategorySlugTaken = async (
  slug: string,
  exceptId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> => {
  const [category, item] = await Promise.all([
    db.materialCategory.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    }),
    db.material.findFirst({ where: { slug }, select: { id: true } }),
  ]);
  return Boolean(category || item);
};

export const createMaterialCategory = async (
  input: MaterialCategoryWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  const row = await db.materialCategory.create({
    data: {
      id: `material-category-${input.slug}`,
      slug: input.slug,
      name: asJsonInput(input.name),
      image: input.image,
      sortOrder: input.sortOrder,
    },
  });
  return row.id;
};

export const updateMaterialCategory = async (
  id: string,
  input: MaterialCategoryWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.materialCategory.update({
    where: { id },
    data: {
      slug: input.slug,
      name: asJsonInput(input.name),
      image: input.image,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteMaterialCategory = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.materialCategory.delete({ where: { id } });
};
