import { cache } from "react";
import { type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asJsonInput, asLocalized } from "../casting";
import { HOME_COLLECTION_HREF, HOME_COLLECTION_SLOT } from "./slots";

/** components/home/HomeCollectionBanner.tsx — standalone, no FK. */
export type ResolvedHomeCollectionFeature = {
  enabled: boolean;
  title: Localized;
  text: Localized;
  image: string;
  /** The collections index (`/collections`). */
  ctaHref: string;
};

/** Columns of the standalone HomeCollection slot as the admin form submits them. */
export type HomeCollectionFeatureWriteInput = {
  enabled: boolean;
  image: string;
  title: Localized;
  text: Localized;
};

/**
 * The Home Collection banner owns its content outright — no FK, and therefore
 * no `reference`/`override` mode to resolve.
 */
export const getHomeCollectionFeature = cache(
  async (): Promise<ResolvedHomeCollectionFeature | null> => {
    const row = await prisma.homeCollectionFeature.findUnique({
      where: { id: HOME_COLLECTION_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      title: asLocalized(row.title),
      text: asLocalized(row.text),
      image: row.image,
      ctaHref: HOME_COLLECTION_HREF,
    };
  },
);

/** The standalone HomeCollection slot as the admin form edits it. */
export const getHomeCollectionFeatureAdminDetail = cache(
  async (): Promise<HomeCollectionFeatureWriteInput | null> => {
    const row = await prisma.homeCollectionFeature.findUnique({
      where: { id: HOME_COLLECTION_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      image: row.image,
      title: asLocalized(row.title),
      text: asLocalized(row.text),
    };
  },
);

/** Saves the HomeCollection slot (singleton upsert, see flagship-one.ts). */
export const updateHomeCollectionFeature = async (
  input: HomeCollectionFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    image: input.image,
    title: asJsonInput(input.title),
    text: asJsonInput(input.text),
  };

  await db.homeCollectionFeature.upsert({
    where: { id: HOME_COLLECTION_SLOT },
    create: { id: HOME_COLLECTION_SLOT, ...data },
    update: data,
  });
};
