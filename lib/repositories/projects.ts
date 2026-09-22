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
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import {
  asJsonInput,
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

/** A project row as the admin form submits it (mirrors `projectFormSchema`). */
export type ProjectWriteInput = {
  slug: string;
  /** Translation key prefix, e.g. "projects.hIstra". */
  i18nKey: string;
  name: Localized;
  location: string;
  /** The source data uses "2026" — a string, not a number. */
  year: string;
  image: string;
  description: Localized;
  paragraph: Localized;
  moreDescription: Localized[];
  /** Mixed entries are valid in the source data. */
  credits: (Localized | string)[];
  portfolioImages: string[];
  sortOrder: number;
  /** Product ids in display order; synced with the join table on save. */
  productIds: string[];
};

export const createProject = async (
  input: ProjectWriteInput,
): Promise<string> => {
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        id: input.slug,
        slug: input.slug,
        i18nKey: input.i18nKey,
        name: asJsonInput(input.name),
        location: input.location,
        year: input.year,
        image: input.image,
        description: asJsonInput(input.description),
        paragraph: asJsonInput(input.paragraph),
        moreDescription: asJsonInput(input.moreDescription),
        credits: asJsonInput(input.credits),
        portfolioImages: input.portfolioImages,
        sortOrder: input.sortOrder,
      },
    });

    if (input.productIds.length > 0) {
      await tx.projectProduct.createMany({
        data: input.productIds.map((productId, order) => ({
          projectId: created.id,
          productId,
          order,
        })),
      });
    }

    return created;
  });

  return row.id;
};

export const updateProject = async (
  id: string,
  input: ProjectWriteInput,
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        slug: input.slug,
        i18nKey: input.i18nKey,
        name: asJsonInput(input.name),
        location: input.location,
        year: input.year,
        image: input.image,
        description: asJsonInput(input.description),
        paragraph: asJsonInput(input.paragraph),
        moreDescription: asJsonInput(input.moreDescription),
        credits: asJsonInput(input.credits),
        portfolioImages: input.portfolioImages,
        sortOrder: input.sortOrder,
      },
    });

    // The ordered product list is a full replace: the composite PK
    // (projectId, productId) makes upsert-with-reorder awkward, and the list is
    // always submitted whole, so sync by clearing then recreating in order.
    await tx.projectProduct.deleteMany({ where: { projectId: id } });
    if (input.productIds.length > 0) {
      await tx.projectProduct.createMany({
        data: input.productIds.map((productId, order) => ({
          projectId: id,
          productId,
          order,
        })),
      });
    }
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  // ProjectProduct rows cascade via the schema's onDelete: Cascade.
  await prisma.project.delete({ where: { id } });
};