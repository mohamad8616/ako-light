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
  asNullableJsonInput,
  asOptionalLocalized,
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

/**
 * The text+image section under the gallery, already RESOLVED for rendering.
 *
 * `text` is `Localized | string` because it can come from either source: an
 * explicit override (always a pair) or the legacy `moreDescription` list.
 */
export type ResolvedTextImageSection = {
  image: string;
  text: Localized | string;
};

/** The full-width image section under the gallery, already RESOLVED. */
export type ResolvedFullImageSection = {
  image: string;
  caption: Localized | string;
};

/**
 * A project as the PUBLIC pages read it: {@link Project} plus the two portfolio
 * sections resolved.
 *
 * They are resolved HERE rather than in the page so the override-then-fallback
 * rule lives in one place, and so the page stays a straight render. `null` means
 * there is nothing to show — neither an override nor a fallback photo — and the
 * section is skipped.
 */
export type ProjectDetail = Project & {
  textImageSection: ResolvedTextImageSection | null;
  fullImageSection: ResolvedFullImageSection | null;
};

/**
 * The two sections under the gallery, resolved from their override columns.
 *
 * Each section's photo and copy resolve INDEPENDENTLY: an explicit admin value
 * wins, and a NULL column falls back to the position the page used before these
 * columns existed (`portfolioImages[0]`/`[1]` with `moreDescription[0]`/`[1]`).
 * That is what makes the columns need no backfill — an untouched project renders
 * byte-for-byte what it always did.
 *
 * A section with NO photo (no override and no photo at that gallery position) is
 * `null` and the page renders nothing: `next/image` throws on a missing `src`.
 * The copy falls back to `""` rather than `undefined` because `pick(undefined)`
 * throws, while `pick("")` is a legal empty string.
 */
function resolvePortfolioSections(row: ProjectRow): {
  textImageSection: ResolvedTextImageSection | null;
  fullImageSection: ResolvedFullImageSection | null;
} {
  const paragraphs = asLocalizedList(row.moreDescription);
  const textImage = row.textImageUrl ?? row.portfolioImages[0] ?? null;
  const fullImage = row.fullImageUrl ?? row.portfolioImages[1] ?? null;

  return {
    textImageSection: textImage
      ? {
          image: textImage,
          text: asOptionalLocalized(row.textImageText) ?? paragraphs[0] ?? "",
        }
      : null,
    fullImageSection: fullImage
      ? {
          image: fullImage,
          caption:
            asOptionalLocalized(row.fullImageCaption) ?? paragraphs[1] ?? "",
        }
      : null,
  };
}

function mapProjectRow(row: ProjectRow): ProjectDetail {
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
    ...resolvePortfolioSections(row),
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
  async (slug: string): Promise<ProjectDetail | null> => {
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
  async (id: string): Promise<ProjectDetail | null> => getProject(id),
);

/**
 * Every project in the curated source-array order (`Project.sortOrder`).
 */
export const getProjects = cache(async (): Promise<ProjectDetail[]> => {
  const rows = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { sortOrder: "asc" },
  });

  return rows.map(mapProjectRow);
});

/** `""` is the form's "not configured" value for an override column → SQL NULL. */
const emptyToNull = (value: string): string | null =>
  value === "" ? null : value;

/**
 * `{ en: "", fa: "" }` is the form's "cleared" pair → SQL NULL.
 *
 * `clearableLocalizedSchema` guarantees a pair is either complete or entirely
 * empty, so this is the only "not configured" spelling that can reach here.
 */
const emptyPairToNull = (value: Localized): Localized | null =>
  value.en === "" && value.fa === "" ? null : value;

/**
 * Legacy `Project.credits` rows may hold plain strings (shared across both
 * languages). The form edits every credit as an EN/FA pair, and a plain string
 * cannot host `credits.0.en`, so the ADMIN read widens a legacy string into
 * `{ en: s, fa: s }` — the next save then persists a real pair.
 *
 * The PUBLIC read stays permissive (`asMixedLocalizedList`): `pick()` renders
 * either representation, so a row nobody re-saves keeps working untouched.
 */
function creditsAsPairs(value: unknown): Localized[] {
  return asMixedLocalizedList(value).map((credit) =>
    typeof credit === "string" ? { en: credit, fa: credit } : credit,
  );
}

/**
 * A project row as the admin form submits it (mirrors `projectFormSchema`).
 *
 * The two portfolio-section overrides are spelled the way a react-hook-form
 * input yields them — `""` for a URL, an empty pair for a localized value — and
 * `createProject`/`updateProject` turn those into SQL NULL. That keeps the
 * form's `values` and this type structurally identical, which is what lets
 * `getProjectAdminDetail` feed the form directly.
 */
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
  /** Always EN/FA pairs; the admin read widens legacy plain strings. */
  credits: Localized[];
  portfolioImages: string[];
  /** "" = no override → `portfolioImages[0]`. */
  textImageUrl: string;
  /** An empty pair = no override → `moreDescription[0]`. */
  textImageText: Localized;
  /** "" = no override → `portfolioImages[1]`. */
  fullImageUrl: string;
  /** An empty pair = no override → `moreDescription[1]`. */
  fullImageCaption: Localized;
  sortOrder: number;
  /** Product ids in display order; synced with the join table on save. */
  productIds: string[];
};

export type ProjectAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  location: string;
  year: string;
  image: string;
  sortOrder: number;
  /** Linked Product rows via the project_product join table. */
  productCount: number;
};

/**
 * Every project as the admin table needs it, in curated `sortOrder` order,
 * with the join-table product count the table's last column shows.
 */
export const getProjectAdminRows = cache(
  async (): Promise<ProjectAdminRow[]> => {
    const rows = await prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { productsUsed: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      location: row.location,
      year: row.year,
      image: row.image,
      sortOrder: row.sortOrder,
      productCount: row._count.productsUsed,
    }));
  },
);

/**
 * One project as the admin form edits it: every column plus the ORDERED
 * `productIds` read off the join table, which is the list the form's
 * ProductsUsedField writes back on save.
 *
 * Every "not configured" value is spelled the way the FORM holds it — `""` for
 * an override URL and an empty pair for a localized one — because this object is
 * the form's initial `values`. The write path converts them back to NULL.
 */
export const getProjectAdminDetail = cache(
  async (id: string): Promise<ProjectWriteInput | null> => {
    const row = await prisma.project.findUnique({
      where: { id },
      include: {
        productsUsed: {
          orderBy: { order: "asc" },
          select: { productId: true },
        },
      },
    });
    if (!row) return null;

    return {
      slug: row.slug,
      i18nKey: row.i18nKey,
      name: asLocalized(row.name),
      location: row.location,
      year: row.year,
      image: row.image,
      description: asLocalized(row.description),
      paragraph: asLocalized(row.paragraph),
      moreDescription: asLocalizedList(row.moreDescription),
      // Legacy plain strings become real pairs here — see `creditsAsPairs`.
      credits: creditsAsPairs(row.credits),
      portfolioImages: row.portfolioImages,
      textImageUrl: row.textImageUrl ?? "",
      textImageText: asOptionalLocalized(row.textImageText) ?? {
        en: "",
        fa: "",
      },
      fullImageUrl: row.fullImageUrl ?? "",
      fullImageCaption: asOptionalLocalized(row.fullImageCaption) ?? {
        en: "",
        fa: "",
      },
      sortOrder: row.sortOrder,
      productIds: row.productsUsed.map((link) => link.productId),
    };
  },
);

export const createProject = async (
  input: ProjectWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  // A caller-supplied client (the test suite passes its rolled-back
  // transaction) is already transactional — run on it directly. The default
  // client opens its own transaction so row + join rows stay atomic.
  const run = async (tx: Prisma.TransactionClient) => {
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
        textImageUrl: emptyToNull(input.textImageUrl),
        textImageText: asNullableJsonInput(emptyPairToNull(input.textImageText)),
        fullImageUrl: emptyToNull(input.fullImageUrl),
        fullImageCaption: asNullableJsonInput(
          emptyPairToNull(input.fullImageCaption),
        ),
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
  };

  const row = db === prisma ? await prisma.$transaction(run) : await run(db);
  return row.id;
};

export const updateProject = async (
  id: string,
  input: ProjectWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const run = async (tx: Prisma.TransactionClient) => {
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
        textImageUrl: emptyToNull(input.textImageUrl),
        textImageText: asNullableJsonInput(emptyPairToNull(input.textImageText)),
        fullImageUrl: emptyToNull(input.fullImageUrl),
        fullImageCaption: asNullableJsonInput(
          emptyPairToNull(input.fullImageCaption),
        ),
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
  };

  if (db === prisma) {
    await prisma.$transaction(run);
  } else {
    await run(db);
  }
};

export const deleteProject = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  // ProjectProduct rows cascade via the schema's onDelete: Cascade.
  await db.project.delete({ where: { id } });
};
