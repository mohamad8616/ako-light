/**
 * Homepage feature slots — Prisma-backed replacement for the per-banner data
 * that used to live in `lib/data/homepage.ts` (myPlan.md Part C).
 *
 * Every homepage banner is a singleton "feature" row (see prisma/schema.prisma
 * → "Homepage feature slots"). A slot either *references* a catalog entity
 * (`reference` mode — the displayed copy/image is read off the linked row) or
 * *overrides* it (`override` mode — the slot's own columns win, and any column
 * left NULL still falls back to the linked row, so a partial override can never
 * blank a banner out). The CTA destination is ALWAYS the linked entity's
 * canonical route (`/flagship/<slug>`, `/projects/<slug>`): override mode
 * changes what is displayed, never where the button goes.
 * `HomeCollectionBanner` is the exception — standalone content with no FK and
 * no mode toggle.
 *
 * `Resolved*` types are what the components consume: `Localized` values are
 * picked per language inside the component (`pick(value, lang)`), and `*Href`
 * is always a canonical route or a catalogue PDF link. A resolver returns
 * `null` when the slot row does not exist yet, which components render exactly
 * like `enabled: false` (nothing).
 */
import { cache } from "react";
import { FeatureMode, type Prisma } from "@/generated/prisma/client";
import type { FlagshipDetail } from "@/lib/data/flagships";
import { loc, type Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import {
  asJson,
  asJsonInput,
  asLocalized,
  asLocalizedList,
  asNullableJsonInput,
  asOptionalLocalized,
} from "./casting";

// ---------------------------------------------------------------------------
// Slot keys — the singleton rows' primary keys (mirror prisma/seed.ts).
// ---------------------------------------------------------------------------

export const FLAGSHIP_ONE_SLOT = "flagship-one";
export const PROJECT_BANNER_SLOT = "project-banner";
export const PROJECT_DARK_BACKGROUND_SLOT = "project-dark-background";
export const HOME_COLLECTION_SLOT = "home-collection";
export const CATALOGUE_SLOT = "catalogue";

/** Every homepage slot key — also the order the banners render in. */
export type HomepageFeatureSlot =
  | typeof FLAGSHIP_ONE_SLOT
  | typeof PROJECT_BANNER_SLOT
  | typeof PROJECT_DARK_BACKGROUND_SLOT
  | typeof HOME_COLLECTION_SLOT
  | typeof CATALOGUE_SLOT;

/** The Home Collection banner links to the collections index. */
export const HOME_COLLECTION_HREF = "/collections";

/** Canonical route of a flagship — the FlagshipOne CTA target. */
function flagshipHref(slug: string): string {
  return `/flagship/${slug}`;
}

/** Canonical route of a project — the project banners' CTA target. */
function projectHref(slug: string): string {
  return `/projects/${slug}`;
}

/**
 * A slot in `override` mode whose column is NULL falls back to the value read
 * off the linked entity. Override columns are individually nullable, so an
 * admin who only retitles a banner keeps the referenced image, and so on.
 */
function resolveField<T>(
  isOverride: boolean,
  override: T | null | undefined,
  reference: T,
): T {
  return isOverride && override != null ? override : reference;
}

/**
 * Narrows a nullable `Localized[]` override column. Unlike
 * `asLocalizedList()` this keeps NULL distinct from `[]`: NULL means "not
 * overridden" (fall back to the linked entity), `[]` means "the admin cleared
 * the paragraphs" (render none).
 */
function asOptionalLocalizedList(value: unknown): Localized[] | null {
  return value == null ? null : asLocalizedList(value);
}

// ---------------------------------------------------------------------------
// Resolved (public-site) reads — one per homepage banner.
// ---------------------------------------------------------------------------

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

/** components/home/projectBanner.tsx — the H Istra project banner. */
export type ResolvedProjectBannerFeature = {
  enabled: boolean;
  kicker: Localized;
  title: Localized;
  image: string;
  /** Canonical route of the linked project (`/projects/<slug>`). */
  ctaHref: string;
};

/** components/home/projectWithDarkBackground.tsx — the Vocla 2026 banner. */
export type ResolvedProjectDarkBackgroundFeature = {
  enabled: boolean;
  title: Localized;
  paragraphs: Localized[];
  image: string;
  /** Canonical route of the linked project (`/projects/<slug>`). */
  ctaHref: string;
};

/** components/home/HomeCollectionBanner.tsx — standalone, no FK. */
export type ResolvedHomeCollectionFeature = {
  enabled: boolean;
  title: Localized;
  text: Localized;
  image: string;
  /** The collections index (`/collections`). */
  ctaHref: string;
};

/** components/home/CatalogueSection.tsx — title/PDF come from CatalogueItem. */
export type ResolvedCatalogueFeature = {
  enabled: boolean;
  /** `CatalogueItem.title`, e.g. "S34/5". */
  title: string;
  /** `CatalogueItem.href` — the catalogue PDF. */
  downloadHref: string;
  /** Section photo (the slot owns it: CatalogueItem has no image column). */
  image: string;
};

const flagshipOneInclude = {
  flagship: true,
} satisfies Prisma.FlagshipOneFeatureInclude;

type FlagshipOneRow = Prisma.FlagshipOneFeatureGetPayload<{
  include: typeof flagshipOneInclude;
}>;

type ProjectBannerRow = Prisma.ProjectBannerFeatureGetPayload<{
  include: { project: true };
}>;

type ProjectDarkBackgroundRow = Prisma.ProjectDarkBackgroundFeatureGetPayload<{
  include: { project: true };
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

/** The Home Collection banner owns its content outright — no mode toggle. */
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
    };
  },
);

// ---------------------------------------------------------------------------
// Admin reads & writes (myPlan.md Part D consumes these).
//
// The `*WriteInput` types mirror the feature rows' columns exactly — including
// the *unresolved* override values — which is what the admin forms edit.
// ---------------------------------------------------------------------------

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

/** Columns of the standalone HomeCollection slot as the admin form submits them. */
export type HomeCollectionFeatureWriteInput = {
  enabled: boolean;
  image: string;
  title: Localized;
  text: Localized;
};

/** Columns of the Catalogue slot as the admin form submits them. */
export type CatalogueFeatureWriteInput = {
  enabled: boolean;
  /** CatalogueItem.id */
  catalogueItemId: string;
  image: string;
};

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

/** Saves the ProjectBanner slot (singleton upsert, see FlagshipOne above). */
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

/** Saves the ProjectDarkBackground slot (singleton upsert, see FlagshipOne). */
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

/** Saves the HomeCollection slot (singleton upsert, see FlagshipOne above). */
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
    };
  },
);

/** Saves the Catalogue slot (singleton upsert, see FlagshipOne above). */
export const updateCatalogueFeature = async (
  input: CatalogueFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    catalogueItemId: input.catalogueItemId,
    image: input.image,
  };

  await db.catalogueFeature.upsert({
    where: { id: CATALOGUE_SLOT },
    create: { id: CATALOGUE_SLOT, ...data },
    update: data,
  });
};

// ---------------------------------------------------------------------------
// Admin overview — one summary row per slot for the homepage hub page.
// ---------------------------------------------------------------------------

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
