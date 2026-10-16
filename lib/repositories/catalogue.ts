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
    pdfUrl: row.pdfUrl ?? undefined,
    pdfName: row.pdfName ?? undefined,
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
      pdfUrl: row.pdfUrl ?? undefined,
      pdfName: row.pdfName ?? undefined,
      coverColor: row.coverColor,
      coverTextColor: row.coverTextColor ?? undefined,
    };
  },
);

export type CatalogueItemAdminRow = {
  id: string;
  title: string;
  /** Retained for legacy/external catalogue rows; no longer editable. */
  href: string;
  pdfUrl: string | null;
  pdfName: string | null;
  coverColor: string;
  coverTextColor?: string;
  sortOrder: number;
};

export type CatalogueItemWriteInput = {
  id: string;
  title: string;
  /** Only set to `"#"` when removing an uploaded file should clear legacy href. */
  href?: string;
  pdfUrl: string | null;
  pdfName: string | null;
  coverColor: string;
  coverTextColor: string | null;
  sortOrder: number;
};

export const getCatalogueItemAdminDetail = cache(
  async (id: string): Promise<CatalogueItemAdminRow | null> => {
    const row = await prisma.catalogueItem.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      href: row.href,
      pdfUrl: row.pdfUrl,
      pdfName: row.pdfName,
      coverColor: row.coverColor,
      coverTextColor: row.coverTextColor ?? undefined,
      sortOrder: row.sortOrder,
    };
  },
);

export const getCatalogueDocument = async (
  id: string,
): Promise<{ url: string; name: string } | null> => {
  const row = await prisma.catalogueItem.findUnique({
    where: { id },
    select: { pdfUrl: true, pdfName: true },
  });
  if (!row?.pdfUrl) return null;
  return { url: row.pdfUrl, name: row.pdfName ?? "" };
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
      pdfUrl: row.pdfUrl,
      pdfName: row.pdfName,
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
      // Uploaded files supersede the old link field. New rows start with `#`
      // because a link has never been provided by this form.
      href: input.href ?? "#",
      pdfUrl: input.pdfUrl,
      pdfName: input.pdfName,
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
      ...(input.href === undefined ? {} : { href: input.href }),
      pdfUrl: input.pdfUrl,
      pdfName: input.pdfName,
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
