/**
 * FabricItem reads — Prisma-backed replacement for the `fabrics` array in
 * `lib/data/materials.ts`.
 *
 * FabricItem is a separate entity from Material — materials cover stone/metal/
 * glass/wood/etc., while fabric items are upholstery textile swatches with
 * codes and colors.
 */
import { cache } from "react";
import type { FabricItem as FabricItemRow } from "@/generated/prisma/client";
import type { FabricItem } from "@/lib/data/materials";
import { prisma } from "@/lib/db/prisma";

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