/**
 * CatalogueItem reads — Prisma-backed replacement for the `catalogueItems`
 * array in `lib/data/catalogue.ts`.
 */
import { cache } from "react";
import type { CatalogueItem } from "@/lib/data/catalogue";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const getCatalogueItems = cache(async (): Promise<CatalogueItem[]> => {
  const rows = await prisma.catalogueItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    href: row.href,
    coverColor: row.coverColor,
    coverTextColor: row.coverTextColor ?? undefined,
  }));
});

export const getCatalogueItem = cache(
  async (id: string): Promise<CatalogueItem | null> => {
    const row = await prisma.catalogueItem.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      href: row.href,
      coverColor: row.coverColor,
      coverTextColor: row.coverTextColor ?? undefined,
    };
  },
);

export type CatalogueItemAdminRow = {
  id: string;
  title: string;
  href: string;
  coverColor: string;
  coverTextColor?: string;
  sortOrder: number;
};

export type CatalogueItemWriteInput = {
  id: string;
  title: string;
  href: string;
  coverColor: string;
  coverTextColor: string | null;
  sortOrder: number;
};

export const getCatalogueItemAdminRows = cache(
  async (): Promise<CatalogueItemAdminRow[]> => {
    const rows = await prisma.catalogueItem.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      href: row.href,
      coverColor: row.coverColor,
      coverTextColor: row.coverTextColor ?? undefined,
      sortOrder: row.sortOrder,
    }));
  },
);

export const createCatalogueItem = async (
  input: CatalogueItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  const row = await db.catalogueItem.create({
    data: {
      id: input.id,
      title: input.title,
      href: input.href,
      coverColor: input.coverColor,
      coverTextColor: input.coverTextColor ?? null,
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateCatalogueItem = async (
  id: string,
  input: CatalogueItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.catalogueItem.update({
    where: { id },
    data: {
      title: input.title,
      href: input.href,
      coverColor: input.coverColor,
      coverTextColor: input.coverTextColor ?? null,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteCatalogueItem = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.catalogueItem.delete({ where: { id } });
};
