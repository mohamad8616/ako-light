import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import {
  asLocalized,
  asNullableJsonInput,
} from "../casting";
import { HERO_SLOT } from "./slots";

export const ABOUT_HERO_MEDIA_SLOT = "about-hero-media";
export const S34_HERO_MEDIA_SLOT = "s34-hero-media";

/** One of the two page hero media slots this repository can address. */
export type PageHeroMediaSlot = "about" | "s34";

/**
 * The /about and /s34 hero video slots.
 *
 * They live in `hero_feature` (see `HERO_*` below) as extra SINGLETON rows —
 * keyed `about-hero-media` / `s34-hero-media` — so each page owns its own
 * background film without a second table: they carry ONLY `videoUrl`, and the
 * empty text/media columns are the same NULL = "nothing configured" the
 * homepage hero uses.
 */
export type PageHeroMediaWriteInput = {
  videoUrl: string | null;
  /** The preloader frame for that page's hero video. NULL = the video's own first frame. */
  posterUrl: string | null;
};

/**
 * The homepage hero — components/home/HeroSection.tsx (Pass D.1).
 *
 * ── Why every field is nullable ─────────────────────────────────────────────
 *
 * The hero is the one section whose content was NEVER in the database: its two
 * lines and its button label are `hero.*` dictionary strings, and its media are
 * the static `/videos/hero.mp4` + `/videos/hero-poster.jpg` assets, which the
 * operator has since DELETED (so NULL now means "no media", not "the stock
 * film" — the CTA target and the dictionary copy are the only defaults left).
 * NULL here does not mean "missing" — it means "use the built-in default", exactly
 * like the catalogue paragraph's empty list. That is what lets this table be
 * added with no backfill: an empty table renders the hero precisely as it was.
 *
 * The dictionary fallback itself lives in the COMPONENT, not here, because the
 * dictionary is a client concern (the provider hands the active locale's copy
 * down) — the same rule the catalogue paragraph and CTA label follow.
 *
 * ── Why there is no `mode` and no FK ────────────────────────────────────────
 *
 * The hero references no catalog entity, so there is nothing to reference or
 * override: like `HomeCollectionFeature` it owns its content outright.
 */
export type ResolvedHeroFeature = {
  enabled: boolean;
  /** Absolute storage URL, or a path under /public. NULL = built-in asset. */
  videoUrl: string | null;
  /** The frame painted before the video loads. NULL = built-in poster. */
  posterUrl: string | null;
  /** The h1 line. NULL = `t("hero.collection")`. */
  firstLine: Localized | null;
  /** The h2 line. NULL = `t("hero.ritualGravity")`. */
  secondLine: Localized | null;
  /** The CTA button label. NULL = `t("hero.readMore")`. */
  ctaLabel: Localized | null;
  /** The CTA destination. NULL = the component's own default (`/catalogue`). */
  ctaHref: string | null;
};

/** The hero as the admin form submits it. */
export type HeroFeatureWriteInput = {
  enabled: boolean;
  videoUrl: string | null;
  posterUrl: string | null;
  firstLine: Localized | null;
  secondLine: Localized | null;
  ctaLabel: Localized | null;
  ctaHref: string | null;
};

/** The hero the public page renders; `null` when the slot was never saved. */
export const getPageHeroMedia = cache(
  async (page: PageHeroMediaSlot): Promise<PageHeroMediaWriteInput> => {
    const id = page === "about" ? ABOUT_HERO_MEDIA_SLOT : S34_HERO_MEDIA_SLOT;
    const row = await prisma.heroFeature.findUnique({ where: { id } });
    return { videoUrl: row?.videoUrl ?? null, posterUrl: row?.posterUrl ?? null };
  },
);

export const updatePageHeroMedia = async (
  page: PageHeroMediaSlot,
  media: { videoUrl: string | null; posterUrl: string | null },
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const id = page === "about" ? ABOUT_HERO_MEDIA_SLOT : S34_HERO_MEDIA_SLOT;
  await db.heroFeature.upsert({
    where: { id },
    create: {
      id,
      enabled: true,
      videoUrl: media.videoUrl,
      posterUrl: media.posterUrl,
      firstLine: Prisma.DbNull,
      secondLine: Prisma.DbNull,
      ctaLabel: Prisma.DbNull,
      ctaHref: null,
    },
    update: { videoUrl: media.videoUrl, posterUrl: media.posterUrl },
  });
};

export const getHeroFeature = cache(
  async (): Promise<ResolvedHeroFeature | null> => {
    const row = await prisma.heroFeature.findUnique({
      where: { id: HERO_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      videoUrl: row.videoUrl,
      posterUrl: row.posterUrl,
      firstLine: asLocalizedOrNull(row.firstLine),
      secondLine: asLocalizedOrNull(row.secondLine),
      ctaLabel: asLocalizedOrNull(row.ctaLabel),
      ctaHref: row.ctaHref,
    };
  },
);

/** The hero as the admin form edits it. */
export const getHeroFeatureAdminDetail = cache(
  async (): Promise<HeroFeatureWriteInput | null> => {
    const row = await prisma.heroFeature.findUnique({
      where: { id: HERO_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      videoUrl: row.videoUrl,
      posterUrl: row.posterUrl,
      firstLine: asLocalizedOrNull(row.firstLine),
      secondLine: asLocalizedOrNull(row.secondLine),
      ctaLabel: asLocalizedOrNull(row.ctaLabel),
      ctaHref: row.ctaHref,
    };
  },
);

/** Saves the hero slot (singleton upsert, see flagship-one.ts). */
export const updateHeroFeature = async (
  input: HeroFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    videoUrl: input.videoUrl,
    posterUrl: input.posterUrl,
    firstLine: asNullableJsonInput(input.firstLine),
    secondLine: asNullableJsonInput(input.secondLine),
    ctaLabel: asNullableJsonInput(input.ctaLabel),
    ctaHref: input.ctaHref,
  };

  await db.heroFeature.upsert({
    where: { id: HERO_SLOT },
    create: { id: HERO_SLOT, ...data },
    update: data,
  });
};

/**
 * A nullable `jsonb` column as `Localized | null`.
 *
 * `asOptionalLocalized` returns `undefined` for NULL; the resolved DTO spells
 * absence as `null` so it crosses the server/client boundary unambiguously
 * (a missing key and an explicit null are different things in a React prop).
 */
function asLocalizedOrNull(value: unknown): Localized | null {
  return value == null ? null : asLocalized(value);
}
