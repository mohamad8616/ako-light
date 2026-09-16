/**
 * Material reads — Prisma-backed replacement for the `materials` array in
 * `lib/data/materials.ts`.
 *
 * Only the material records move; `materialCategories` and `fabrics` from the
 * same module stay static because they are consumed by client components.
 */
import { cache } from "react";
import {
  MaterialType,
  type Material as MaterialRow,
} from "@/generated/prisma/client";
import type { Material } from "@/lib/data/materials";
import { prisma } from "@/lib/db/prisma";
import { asLocalized } from "./casting";

/**
 * Prisma enum -> the union `Material.type` uses in the app.
 * `stone_composite` is the one value whose Prisma member name cannot carry the
 * hyphen; the database stores "stone-composite" via `@map`.
 */
const MATERIAL_TYPES: Record<MaterialType, Material["type"]> = {
  [MaterialType.stone]: "stone",
  [MaterialType.metal]: "metal",
  [MaterialType.glass]: "glass",
  [MaterialType.wood]: "wood",
  [MaterialType.fabric]: "fabric",
  [MaterialType.leather]: "leather",
  [MaterialType.marble]: "marble",
  [MaterialType.stone_composite]: "stone-composite",
};

function mapMaterialRow(row: MaterialRow): Material {
  return {
    id: row.id,
    name: asLocalized(row.name),
    category: row.category,
    image: row.image,
    description: asLocalized(row.description),
    type: MATERIAL_TYPES[row.type],
  };
}

/**
 * One material by slug.
 *
 * The source data had no slug — `id` was already URL-safe and became the slug
 * when seeding, so a `/materials/<id>` route param resolves here either way
 * (slug first, then `id` fallback). A param that is a materials *category*
 * ("fabrics", "metals", ...) finds nothing, which is how those category views
 * were reached before too.
 */
export const getMaterial = cache(
  async (slug: string): Promise<Material | null> => {
    const bySlug = await prisma.material.findUnique({ where: { slug } });
    if (bySlug) return mapMaterialRow(bySlug);

    const byId = await prisma.material.findFirst({ where: { id: slug } });
    return byId ? mapMaterialRow(byId) : null;
  },
);

/**
 * Every material in the curated source-array order (`Material.sortOrder`).
 */
export const getMaterials = cache(async (): Promise<Material[]> => {
  const rows = await prisma.material.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapMaterialRow);
});
