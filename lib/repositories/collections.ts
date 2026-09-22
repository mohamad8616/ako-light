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
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { asJson, asJsonInput, asLocalized } from "./casting";

/**
 * Prisma's `InputJsonValue` only accepts object literals: interfaces such as
 * `Localized` never get an implicit index signature.  Widen app-level values
 * through `unknown` once, here, so every repository write shares the same safe
 * route into `Json` columns.
 */
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

export type CollectionAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  year: string;
  image: string;
  sortOrder: number;
};

export type CollectionWriteInput = {
  slug: string;
  name: Localized;
  year: string;
  image: string;
  description: {
    p1: Localized;
    p2: Localized;
    p3: Localized;
  };
  sortOrder: number;
};

export const getCollectionAdminRows = cache(
  async (): Promise<CollectionAdminRow[]> => {
    const rows = await prisma.collection.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      year: row.year,
      image: row.image,
      sortOrder: row.sortOrder,
    }));
  },
);

export const getCollectionAdminDetail = cache(
  async (id: string): Promise<CollectionWriteInput | null> => {
    const row = await prisma.collection.findUnique({ where: { id } });
    if (!row) return null;

    return {
      slug: row.slug,
      name: asLocalized(row.name),
      year: row.year,
      image: row.image,
      description: asJson<{ p1: Localized; p2: Localized; p3: Localized }>(row.description),
      sortOrder: row.sortOrder,
    };
  },
);

export const createCollection = async (
  input: CollectionWriteInput,
): Promise<string> => {
  const row = await prisma.collection.create({
    data: {
      id: input.slug,
      slug: input.slug,
      name: asJsonInput(input.name),
      year: input.year,
      image: input.image,
      description: asJsonInput(input.description),
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateCollection = async (
  id: string,
  input: CollectionWriteInput,
): Promise<void> => {
  await prisma.collection.update({
    where: { id },
    data: {
      slug: input.slug,
      name: asJsonInput(input.name),
      year: input.year,
      image: input.image,
      description: asJsonInput(input.description),
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteCollection = async (id: string): Promise<void> => {
  await prisma.collection.delete({ where: { id } });
};
