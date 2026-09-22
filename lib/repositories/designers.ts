/**
 * Designer reads — Prisma-backed replacement for the `designers` array in
 * `lib/data/designers.ts`.
 */
import { cache } from "react";
import { Prisma, type Designer as DesignerRow } from "@/generated/prisma/client";
import type { Designer } from "@/lib/data/designers";
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { asLocalized, asLocalizedList } from "./casting";

function mapDesignerRow(row: DesignerRow): Designer {
  return {
    name: asLocalized(row.name),
    slug: row.slug,
    image: row.image,
    bio: asLocalizedList(row.bio),
    website: row.website ?? undefined,
  };
}

/** One designer by slug. */
export const getDesigner = cache(
  async (slug: string): Promise<Designer | null> => {
    const row = await prisma.designer.findUnique({ where: { slug } });
    return row ? mapDesignerRow(row) : null;
  },
);

/**
 * Every designer in the curated source-array order (`Designer.sortOrder`).
 */
export const getDesigners = cache(async (): Promise<Designer[]> => {
  const rows = await prisma.designer.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapDesignerRow);
});

export type DesignerAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  image: string;
  website?: string;
  bio: Localized[];
  sortOrder: number;
  productCount: number;
};

export type DesignerOption = {
  id: string;
  name: Localized;
};

export type DesignerWriteInput = {
  slug: string;
  name: Localized;
  image: string;
  website: string | null;
  bio: Localized[];
  sortOrder: number;
};

export const getDesignerOptions = cache(
  async (): Promise<DesignerOption[]> => {
    const rows = await prisma.designer.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    });

    return rows.map((row) => ({
      id: row.id,
      name: asLocalized(row.name),
    }));
  },
);

export const getDesignerAdminRows = cache(
  async (): Promise<DesignerAdminRow[]> => {
    const rows = await prisma.designer.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      image: row.image,
      website: row.website ?? undefined,
      bio: asLocalizedList(row.bio),
      sortOrder: row.sortOrder,
      productCount: row._count.products,
    }));
  },
);

export const createDesigner = async (
  input: DesignerWriteInput,
): Promise<string> => {
  const row = await prisma.designer.create({
    data: {
      id: input.slug,
      slug: input.slug,
      name: input.name as unknown as Prisma.InputJsonValue,
      image: input.image,
      website: input.website ?? null,
      bio: input.bio as unknown as Prisma.InputJsonValue,
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateDesigner = async (
  id: string,
  input: DesignerWriteInput,
): Promise<void> => {
  await prisma.designer.update({
    where: { id },
    data: {
      slug: input.slug,
      name: input.name as unknown as Prisma.InputJsonValue,
      image: input.image,
      website: input.website ?? null,
      bio: input.bio as unknown as Prisma.InputJsonValue,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteDesigner = async (id: string): Promise<void> => {
  await prisma.designer.delete({ where: { id } });
};
