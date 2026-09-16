/**
 * Collection reads — Prisma-backed replacement for the `collections` array in
 * `lib/data/collections.ts`.
 */
import { cache } from "react";
import type { Collection as CollectionRow } from "@/generated/prisma/client";
import type {
  Collection,
  CollectionDescription,
} from "@/lib/data/collections";
import { prisma } from "@/lib/db/prisma";
import { asJson, asLocalized } from "./casting";

function mapCollectionRow(row: CollectionRow): Collection {
  return {
    slug: row.slug,
    id: row.id,
    name: asLocalized(row.name),
    year: row.year,
    image: row.image,
    // `description` is a jsonb column holding the { p1, p2, p3 } block.
    description: asJson<CollectionDescription>(row.description),
  };
}

/**
 * One collection by slug. The static detail page looked up by `id`; `id` and
 * `slug` coincide for every seeded collection, and `slug` is the unique route
 * handle — the `id` fallback covers both call styles either way.
 */
export const getCollection = cache(
  async (slug: string): Promise<Collection | null> => {
    const bySlug = await prisma.collection.findUnique({ where: { slug } });
    if (bySlug) return mapCollectionRow(bySlug);

    const byId = await prisma.collection.findFirst({ where: { id: slug } });
    return byId ? mapCollectionRow(byId) : null;
  },
);

/**
 * Every collection in the curated source-array order (`Collection.sortOrder`).
 */
export const getCollections = cache(async (): Promise<Collection[]> => {
  const rows = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapCollectionRow);
});
