/**
 * Project reads — Prisma-backed replacement for `projects` / `getProjectById()`
 * in `lib/data/projects.ts`.
 *
 * `productsUsed` is rebuilt from the `project_product` join table, whose
 * `order` column preserves the order the source data generated, so the grouped
 * product sections render identically.
 */
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { Project } from "@/lib/data/projects";
import { prisma } from "@/lib/db/prisma";
import {
  asLocalized,
  asLocalizedList,
  asMixedLocalizedList,
} from "./casting";
import { mapProductRow, productInclude } from "./products";

/** Shared `include` for every project read in this layer. */
export const projectInclude = {
  productsUsed: {
    orderBy: { order: "asc" },
    include: { product: { include: productInclude } },
  },
} satisfies Prisma.ProjectInclude;

/** A `project` row after {@link projectInclude} has been applied. */
export type ProjectRow = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    i18nKey: row.i18nKey,
    name: asLocalized(row.name),
    location: row.location,
    year: row.year,
    image: row.image,
    description: asLocalized(row.description),
    paragraph: asLocalized(row.paragraph),
    moreDescription: asLocalizedList(row.moreDescription),
    credits: asMixedLocalizedList(row.credits),
    portfolioImages: row.portfolioImages,
    productsUsed: row.productsUsed.map((link) =>
      mapProductRow(link.product),
    ),
  };
}

/**
 * One project by slug.
 *
 * The source data had no slug — `id` was already URL-safe and became the slug
 * when seeding, so the `/projects/<id>` route param resolves here (the static
 * module's `getProjectById()` matched on the same value; slug first, then
 * `id` fallback).
 */
export const getProject = cache(
  async (slug: string): Promise<Project | null> => {
    const bySlug = await prisma.project.findUnique({
      where: { slug },
      include: projectInclude,
    });
    if (bySlug) return mapProjectRow(bySlug);

    const byId = await prisma.project.findFirst({
      where: { id: slug },
      include: projectInclude,
    });

    return byId ? mapProjectRow(byId) : null;
  },
);

/**
 * Alias matching the static module's `getProjectById(id)` name so migrated
 * call sites can keep their existing call shape (`await getProjectById(id)`).
 */
export const getProjectById = cache(
  async (id: string): Promise<Project | null> => getProject(id),
);

/**
 * Every project in the curated source-array order (`Project.sortOrder`).
 */
export const getProjects = cache(async (): Promise<Project[]> => {
  const rows = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { sortOrder: "asc" },
  });

  return rows.map(mapProjectRow);
});