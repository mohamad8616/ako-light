import { cache } from "react";
import { FeatureMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asLocalized } from "../casting";
import { flagshipHref, projectHref } from "./resolve";
import {
  CATALOGUE_SLOT,
  FLAGSHIP_ONE_SLOT,
  HOME_COLLECTION_HREF,
  HOME_COLLECTION_SLOT,
  PROJECT_BANNER_SLOT,
  PROJECT_DARK_BACKGROUND_SLOT,
  type HomepageFeatureSlot,
} from "./slots";

/**
 * A homepage slot as the admin hub lists it. Every field is serializable (the
 * `updatedAt` timestamp is an ISO string) so the DTO can cross the
 * client-component boundary as-is; `Localized` labels are picked per language by
 * the consumer, exactly like the other admin tables.
 */
export type HomepageFeatureOverview = {
  id: HomepageFeatureSlot;
  enabled: boolean;
  /** `null` for the standalone Home Collection slot (no reference/override mode). */
  mode: FeatureMode | null;
  /** False when the singleton row is missing (seed not run / row deleted). */
  configured: boolean;
  /** Display name of the linked entity — a plain string for CatalogueItem. */
  entityLabel: Localized | string | null;
  /** Canonical route (or catalogue PDF link) the slot's CTA points at. */
  entityHref: string | null;
  /** ISO timestamp of the last save; `null` when the row is missing. */
  updatedAt: string | null;
};

/**
 * Every slot in the order the homepage renders the banners, so the admin hub
 * reads top-to-bottom like the page it configures.
 *
 * The five reads are independent, so they go out in ONE `Promise.all` rather
 * than five sequential round-trips; each is `select`-scoped to just the columns
 * the summary row needs.
 */
export const getHomepageFeaturesOverview = cache(
  async (): Promise<HomepageFeatureOverview[]> => {
    const [flagshipOne, catalogue, homeCollection, projectBanner, dark] =
      await Promise.all([
        prisma.flagshipOneFeature.findUnique({
          where: { id: FLAGSHIP_ONE_SLOT },
          include: { flagship: { select: { slug: true, name: true } } },
        }),
        prisma.catalogueFeature.findUnique({
          where: { id: CATALOGUE_SLOT },
          include: { catalogueItem: { select: { title: true, href: true } } },
        }),
        prisma.homeCollectionFeature.findUnique({
          where: { id: HOME_COLLECTION_SLOT },
        }),
        prisma.projectBannerFeature.findUnique({
          where: { id: PROJECT_BANNER_SLOT },
          include: { project: { select: { slug: true, name: true } } },
        }),
        prisma.projectDarkBackgroundFeature.findUnique({
          where: { id: PROJECT_DARK_BACKGROUND_SLOT },
          include: { project: { select: { slug: true, name: true } } },
        }),
      ]);

    return [
      {
        id: FLAGSHIP_ONE_SLOT,
        enabled: flagshipOne?.enabled ?? false,
        mode: flagshipOne?.mode ?? null,
        configured: flagshipOne != null,
        entityLabel: flagshipOne ? asLocalized(flagshipOne.flagship.name) : null,
        entityHref: flagshipOne ? flagshipHref(flagshipOne.flagship.slug) : null,
        updatedAt: flagshipOne?.updatedAt.toISOString() ?? null,
      },
      {
        id: CATALOGUE_SLOT,
        enabled: catalogue?.enabled ?? false,
        mode: null,
        configured: catalogue != null,
        entityLabel: catalogue ? catalogue.catalogueItem.title : null,
        entityHref: catalogue ? catalogue.catalogueItem.href : null,
        updatedAt: catalogue?.updatedAt.toISOString() ?? null,
      },
      {
        id: HOME_COLLECTION_SLOT,
        enabled: homeCollection?.enabled ?? false,
        mode: null,
        configured: homeCollection != null,
        entityLabel: homeCollection ? asLocalized(homeCollection.title) : null,
        entityHref: homeCollection ? HOME_COLLECTION_HREF : null,
        updatedAt: homeCollection?.updatedAt.toISOString() ?? null,
      },
      {
        id: PROJECT_BANNER_SLOT,
        enabled: projectBanner?.enabled ?? false,
        mode: projectBanner?.mode ?? null,
        configured: projectBanner != null,
        entityLabel: projectBanner
          ? asLocalized(projectBanner.project.name)
          : null,
        entityHref: projectBanner
          ? projectHref(projectBanner.project.slug)
          : null,
        updatedAt: projectBanner?.updatedAt.toISOString() ?? null,
      },
      {
        id: PROJECT_DARK_BACKGROUND_SLOT,
        enabled: dark?.enabled ?? false,
        mode: dark?.mode ?? null,
        configured: dark != null,
        entityLabel: dark ? asLocalized(dark.project.name) : null,
        entityHref: dark ? projectHref(dark.project.slug) : null,
        updatedAt: dark?.updatedAt.toISOString() ?? null,
      },
    ];
  },
);
