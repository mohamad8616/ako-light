import { cache } from "react";
import { FeatureMode, type Prisma } from "@/generated/prisma/client";
import type { FlagshipDetail } from "@/lib/data/flagships";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import {
  asJson,
  asLocalized,
  asNullableJsonInput,
  asOptionalLocalized,
} from "../casting";
import {
  asOptionalLocalizedList,
  flagshipHref,
  resolveField,
} from "./resolve";
import { FLAGSHIP_ONE_SLOT } from "./slots";

/** components/home/flagshipOne.tsx — the flagship banner (henge-paris today). */
export type ResolvedFlagshipOneFeature = {
  enabled: boolean;
  kicker: Localized;
  title: Localized;
  paragraphs: Localized[];
  image: string;
  /** Canonical route of the linked flagship (`/flagship/<slug>`). */
  ctaHref: string;
};

/** Columns of the FlagshipOne slot as the admin form submits them. */
export type FlagshipOneFeatureWriteInput = {
  enabled: boolean;
  mode: FeatureMode;
  /** Flagship.id — id-based FK convention (slug is the route handle only). */
  flagshipId: string;
  /** Override-mode content; NULL falls back to the linked flagship. */
  kicker: Localized | null;
  title: Localized | null;
  paragraphs: Localized[] | null;
  image: string | null;
};

const flagshipOneInclude = {
  flagship: true,
} satisfies Prisma.FlagshipOneFeatureInclude;

type FlagshipOneRow = Prisma.FlagshipOneFeatureGetPayload<{
  include: typeof flagshipOneInclude;
}>;

/**
 * `reference` mode reads the flagship's own fields: its city as the kicker, its
 * name as the title and — when the flagship has a built-out detail page — its
 * detail description as the body copy. A flagship without detail content simply
 * has no paragraphs (`Flagship.detail` is NULL for those rows).
 */
export const getFlagshipOneFeature = cache(
  async (): Promise<ResolvedFlagshipOneFeature | null> => {
    const row: FlagshipOneRow | null =
      await prisma.flagshipOneFeature.findUnique({
        where: { id: FLAGSHIP_ONE_SLOT },
        include: flagshipOneInclude,
      });
    if (!row) return null;

    const isOverride = row.mode === FeatureMode.override;
    const detail =
      row.flagship.detail == null
        ? null
        : asJson<FlagshipDetail>(row.flagship.detail);

    return {
      enabled: row.enabled,
      kicker: resolveField(
        isOverride,
        asOptionalLocalized(row.kicker),
        asLocalized(row.flagship.city),
      ),
      title: resolveField(
        isOverride,
        asOptionalLocalized(row.title),
        asLocalized(row.flagship.name),
      ),
      paragraphs: resolveField(
        isOverride,
        asOptionalLocalizedList(row.paragraphs),
        detail ? [detail.description] : [],
      ),
      image: resolveField(isOverride, row.image, row.flagship.image),
      ctaHref: flagshipHref(row.flagship.slug),
    };
  },
);

/**
 * One flagship slot as the admin form edits it, or `null` when the row has not
 * been created yet (the form then falls back to its own defaults).
 */
export const getFlagshipOneFeatureAdminDetail = cache(
  async (): Promise<FlagshipOneFeatureWriteInput | null> => {
    const row = await prisma.flagshipOneFeature.findUnique({
      where: { id: FLAGSHIP_ONE_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      mode: row.mode,
      flagshipId: row.flagshipId,
      kicker: asOptionalLocalized(row.kicker) ?? null,
      title: asOptionalLocalized(row.title) ?? null,
      paragraphs: asOptionalLocalizedList(row.paragraphs),
      image: row.image,
    };
  },
);

/**
 * Saves the FlagshipOne slot. `upsert` because the slot is a singleton
 * *configuration* row: the seed creates it once and never rewrites it
 * (`update: {}`), so an admin save on a database where the seed did not run
 * still has to produce the row. Override columns are written as submitted —
 * switching back to `reference` mode keeps them, so no admin copy is lost.
 */
export const updateFlagshipOneFeature = async (
  input: FlagshipOneFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    mode: input.mode,
    flagshipId: input.flagshipId,
    kicker: asNullableJsonInput(input.kicker),
    title: asNullableJsonInput(input.title),
    paragraphs: asNullableJsonInput(input.paragraphs),
    image: input.image,
  };

  await db.flagshipOneFeature.upsert({
    where: { id: FLAGSHIP_ONE_SLOT },
    create: { id: FLAGSHIP_ONE_SLOT, ...data },
    update: data,
  });
};
