/**
 * Designer reads — Prisma-backed replacement for the `designers` array in
 * `lib/data/designers.ts`.
 */
import { cache } from "react";
import type { Designer as DesignerRow } from "@/generated/prisma/client";
import type { Designer } from "@/lib/data/designers";
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
