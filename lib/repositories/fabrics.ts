/**
 * FabricItem reads — Prisma-backed replacement for the `fabrics` array in
 * `lib/data/materials.ts`.
 *
 * FabricItem is a separate entity from Material — materials cover stone/metal/
 * glass/wood/etc., while fabric items are upholstery textile swatches with
 * codes and colors.
 */
import { cache } from "react";
import type { FabricItem } from "@/lib/data/materials";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const getFabricItems = cache(async (): Promise<FabricItem[]> => {
  const rows = await prisma.fabricItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    swatchColor: row.swatchColor,
  }));
});

export const getFabricItem = cache(
  async (id: string): Promise<FabricItem | null> => {
    const row = await prisma.fabricItem.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category,
      swatchColor: row.swatchColor,
    };
  },
);

export type FabricItemAdminRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  swatchColor: string;
  sortOrder: number;
};

export type FabricItemWriteInput = {
  id: string;
  name: string;
  code: string;
  category: string;
  swatchColor: string;
  sortOrder: number;
};

export const getFabricItemAdminRows = cache(
  async (): Promise<FabricItemAdminRow[]> => {
    const rows = await prisma.fabricItem.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category,
      swatchColor: row.swatchColor,
      sortOrder: row.sortOrder,
    }));
  },
);

export const createFabricItem = async (
  input: FabricItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  const row = await db.fabricItem.create({
    data: {
      id: input.id,
      name: input.name,
      code: input.code,
      category: input.category,
      swatchColor: input.swatchColor,
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateFabricItem = async (
  id: string,
  input: FabricItemWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.fabricItem.update({
    where: { id },
    data: {
      name: input.name,
      code: input.code,
      category: input.category,
      swatchColor: input.swatchColor,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteFabricItem = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.fabricItem.delete({ where: { id } });
};
