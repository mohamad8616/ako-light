import { cache } from "react";
import { type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asNullableJsonInput } from "../casting";
import { asOptionalLocalizedList } from "./resolve";
import { CATALOGUE_SLOT } from "./slots";

/** components/home/CatalogueSection.tsx — title/PDF come from CatalogueItem. */
export type ResolvedCatalogueFeature = {
  enabled: boolean;
  /** `CatalogueItem.title`, e.g. "S34/5". */
  title: string;
  /** `CatalogueItem.href` — the catalogue PDF. */
  downloadHref: string;
  /** Section photo (the slot owns it: CatalogueItem has no image column). */
  image: string;
  /**
   * The section's paragraph blocks, edited in the admin panel.
   *
   * EMPTY is a valid answer and means "use the static `catalogue.description`
   * translation" — the component owns that fallback, because the dictionary is
   * a client concern. That is also why the column is nullable: every row that
   * existed before this field was added keeps its copy with no backfill.
   */
  paragraphs: Localized[];
};

/** Columns of the Catalogue slot as the admin form submits them. */
export type CatalogueFeatureWriteInput = {
  enabled: boolean;
  /** CatalogueItem.id */
  catalogueItemId: string;
  image: string;
  paragraphs: Localized[] | null;
};

/** The catalogue section takes its title and PDF href from the linked item. */
export const getCatalogueFeature = cache(
  async (): Promise<ResolvedCatalogueFeature | null> => {
    const row = await prisma.catalogueFeature.findUnique({
      where: { id: CATALOGUE_SLOT },
      include: { catalogueItem: true },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      title: row.catalogueItem.title,
      downloadHref: row.catalogueItem.href,
      image: row.image,
      paragraphs: asOptionalLocalizedList(row.paragraphs) ?? [],
    };
  },
);

/** The Catalogue slot as the admin form edits it, `null` when missing. */
export const getCatalogueFeatureAdminDetail = cache(
  async (): Promise<CatalogueFeatureWriteInput | null> => {
    const row = await prisma.catalogueFeature.findUnique({
      where: { id: CATALOGUE_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      catalogueItemId: row.catalogueItemId,
      image: row.image,
      paragraphs: asOptionalLocalizedList(row.paragraphs),
    };
  },
);

/** Saves the Catalogue slot (singleton upsert, see flagship-one.ts). */
export const updateCatalogueFeature = async (
  input: CatalogueFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    catalogueItemId: input.catalogueItemId,
    image: input.image,
    paragraphs: asNullableJsonInput(input.paragraphs),
  };

  await db.catalogueFeature.upsert({
    where: { id: CATALOGUE_SLOT },
    create: { id: CATALOGUE_SLOT, ...data },
    update: data,
  });
};
