import { cache } from "react";
import { FeatureMode, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asLocalized, asNullableJsonInput, asOptionalLocalized } from "../casting";
import { asOptionalLocalizedList, projectHref, resolveField } from "./resolve";
import { PROJECT_DARK_BACKGROUND_SLOT } from "./slots";

/** components/home/projectWithDarkBackground.tsx — the Vocla 2026 banner. */
export type ResolvedProjectDarkBackgroundFeature = {
  enabled: boolean;
  title: Localized;
  paragraphs: Localized[];
  image: string;
  /** Canonical route of the linked project (`/projects/<slug>`). */
  ctaHref: string;
};

/** Columns of the ProjectDarkBackground slot as the admin form submits them. */
export type ProjectDarkBackgroundFeatureWriteInput = {
  enabled: boolean;
  mode: FeatureMode;
  /** Project.id */
  projectId: string;
  title: Localized | null;
  paragraphs: Localized[] | null;
  image: string | null;
};

type ProjectDarkBackgroundRow = Prisma.ProjectDarkBackgroundFeatureGetPayload<{
  include: { project: true };
}>;

/**
 * `reference` mode reads the project's name as the title and its two primary
 * prose fields — `description` then the long-form `paragraph` — as the pair of
 * paragraphs the banner lays out side by side.
 */
export const getProjectDarkBackgroundFeature = cache(
  async (): Promise<ResolvedProjectDarkBackgroundFeature | null> => {
    const row: ProjectDarkBackgroundRow | null =
      await prisma.projectDarkBackgroundFeature.findUnique({
        where: { id: PROJECT_DARK_BACKGROUND_SLOT },
        include: { project: true },
      });
    if (!row) return null;

    const isOverride = row.mode === FeatureMode.override;

    return {
      enabled: row.enabled,
      title: resolveField(
        isOverride,
        asOptionalLocalized(row.title),
        asLocalized(row.project.name),
      ),
      paragraphs: resolveField(
        isOverride,
        asOptionalLocalizedList(row.paragraphs),
        [
          asLocalized(row.project.description),
          asLocalized(row.project.paragraph),
        ],
      ),
      image: resolveField(isOverride, row.image, row.project.image),
      ctaHref: projectHref(row.project.slug),
    };
  },
);

/** One dark-background slot as the admin form edits it, `null` when missing. */
export const getProjectDarkBackgroundFeatureAdminDetail = cache(
  async (): Promise<ProjectDarkBackgroundFeatureWriteInput | null> => {
    const row = await prisma.projectDarkBackgroundFeature.findUnique({
      where: { id: PROJECT_DARK_BACKGROUND_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      mode: row.mode,
      projectId: row.projectId,
      title: asOptionalLocalized(row.title) ?? null,
      paragraphs: asOptionalLocalizedList(row.paragraphs),
      image: row.image,
    };
  },
);

/** Saves the ProjectDarkBackground slot (singleton upsert, see flagship-one.ts). */
export const updateProjectDarkBackgroundFeature = async (
  input: ProjectDarkBackgroundFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    mode: input.mode,
    projectId: input.projectId,
    title: asNullableJsonInput(input.title),
    paragraphs: asNullableJsonInput(input.paragraphs),
    image: input.image,
  };

  await db.projectDarkBackgroundFeature.upsert({
    where: { id: PROJECT_DARK_BACKGROUND_SLOT },
    create: { id: PROJECT_DARK_BACKGROUND_SLOT, ...data },
    update: data,
  });
};
