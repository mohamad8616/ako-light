import { cache } from "react";
import { FeatureMode, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { loc, type Localized } from "@/lib/i18n/localized";
import { asLocalized, asNullableJsonInput, asOptionalLocalized } from "../casting";
import { projectHref, resolveField } from "./resolve";
import { PROJECT_BANNER_SLOT } from "./slots";

/** components/home/projectBanner.tsx — the H Istra project banner. */
export type ResolvedProjectBannerFeature = {
  enabled: boolean;
  kicker: Localized;
  title: Localized;
  image: string;
  /** Canonical route of the linked project (`/projects/<slug>`). */
  ctaHref: string;
};

/** Columns of the ProjectBanner slot as the admin form submits them. */
export type ProjectBannerFeatureWriteInput = {
  enabled: boolean;
  mode: FeatureMode;
  /** Project.id */
  projectId: string;
  kicker: Localized | null;
  title: Localized | null;
  image: string | null;
};

type ProjectBannerRow = Prisma.ProjectBannerFeatureGetPayload<{
  include: { project: true };
}>;

/**
 * `reference` mode reads the project's own fields: its location as the kicker
 * (the only short label a Project carries — a plain string in the source data,
 * so it is mirrored into both languages) and its name as the title.
 */
export const getProjectBannerFeature = cache(
  async (): Promise<ResolvedProjectBannerFeature | null> => {
    const row: ProjectBannerRow | null =
      await prisma.projectBannerFeature.findUnique({
        where: { id: PROJECT_BANNER_SLOT },
        include: { project: true },
      });
    if (!row) return null;

    const isOverride = row.mode === FeatureMode.override;
    const location = row.project.location;

    return {
      enabled: row.enabled,
      kicker: resolveField(
        isOverride,
        asOptionalLocalized(row.kicker),
        loc(location, location),
      ),
      title: resolveField(
        isOverride,
        asOptionalLocalized(row.title),
        asLocalized(row.project.name),
      ),
      image: resolveField(isOverride, row.image, row.project.image),
      ctaHref: projectHref(row.project.slug),
    };
  },
);

/** One project-banner slot as the admin form edits it, `null` when missing. */
export const getProjectBannerFeatureAdminDetail = cache(
  async (): Promise<ProjectBannerFeatureWriteInput | null> => {
    const row = await prisma.projectBannerFeature.findUnique({
      where: { id: PROJECT_BANNER_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      mode: row.mode,
      projectId: row.projectId,
      kicker: asOptionalLocalized(row.kicker) ?? null,
      title: asOptionalLocalized(row.title) ?? null,
      image: row.image,
    };
  },
);

/** Saves the ProjectBanner slot (singleton upsert, see flagship-one.ts). */
export const updateProjectBannerFeature = async (
  input: ProjectBannerFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    mode: input.mode,
    projectId: input.projectId,
    kicker: asNullableJsonInput(input.kicker),
    title: asNullableJsonInput(input.title),
    image: input.image,
  };

  await db.projectBannerFeature.upsert({
    where: { id: PROJECT_BANNER_SLOT },
    create: { id: PROJECT_BANNER_SLOT, ...data },
    update: data,
  });
};
