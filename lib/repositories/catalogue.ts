/**
 * CatalogueItem reads — Prisma-backed replacement for the `catalogueItems`
 * array in `lib/data/catalogue.ts`.
 */
import { cache } from "react";
import type { CatalogueItem as CatalogueItemRow } from "@/generated/prisma/client";
import type { CatalogueItem } from "@/lib/data/catalogue";
import { prisma } from "@/lib/db/prisma";

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