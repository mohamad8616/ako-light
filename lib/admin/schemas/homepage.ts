import { z } from "zod";
import {
  clearableImageRefSchema,
  clearableLinkSchema,
  clearableLocalizedListSchema,
  clearableLocalizedSchema,
  clearableMediaRefSchema,
  idSchema,
  imageRefSchema,
  localizedSchema,
  NAME_MAX,
} from "./common";

/**
 * Homepage slot schemas (myPlan.md Part D).
 *
 * One schema per feature slot, mirroring the `*WriteInput` types of
 * lib/repositories/homepage-features.ts. Two shapes are homepage-specific:
 *
 *   1. OVERRIDE FIELDS ARE CLEARABLE. A slot row stores every override column as
 *      nullable jsonb: NULL means "not overridden" and the banner falls back to
 *      the linked entity's own value (per field, not per banner). The forms
 *      therefore cannot use `.nullable()` — a react-hook-form input always
 *      yields a value — so "cleared" is spelled as an empty pair / empty list /
 *      empty string, and lib/admin/actions/homepage.ts maps those to NULL.
 *   2. `mode` is the repository's `FeatureMode`, spelled as the two literals
 *      rather than importing the generated enum: this module is bundled into
 *      the client forms, and the generated Prisma client must stay server-only
 *      (see lib/admin/result-server.ts).
 *
 * Schemas carry NO per-field prose (rule from ./common): the action maps each
 * issue's path + code to a translated `admin.error.*` key.
 */

/** The `enabled` switch every slot carries. */
const enabledSchema = z.boolean();

/** How a slot derives its displayed content (mirrors `FeatureMode`). */
const featureModeSchema = z.enum(["reference", "override"]);

/** The flagship banner's rules (mirrors `FlagshipOneFeatureWriteInput`). */
export const flagshipOneFeatureFormSchema = z.object({
  enabled: enabledSchema,
  mode: featureModeSchema,
  /** Flagship.id — the CTA always targets this flagship's canonical route. */
  flagshipId: idSchema,
  kicker: clearableLocalizedSchema,
  title: clearableLocalizedSchema,
  paragraphs: clearableLocalizedListSchema,
  image: clearableImageRefSchema,
});

/** The project banner's rules (mirrors `ProjectBannerFeatureWriteInput`). */
export const projectBannerFeatureFormSchema = z.object({
  enabled: enabledSchema,
  mode: featureModeSchema,
  /** Project.id */
  projectId: idSchema,
  kicker: clearableLocalizedSchema,
  title: clearableLocalizedSchema,
  image: clearableImageRefSchema,
});

/** The dark-background project slot (mirrors `ProjectDarkBackgroundFeatureWriteInput`). */
export const projectDarkBackgroundFeatureFormSchema = z.object({
  enabled: enabledSchema,
  mode: featureModeSchema,
  /** Project.id */
  projectId: idSchema,
  title: clearableLocalizedSchema,
  paragraphs: clearableLocalizedListSchema,
  image: clearableImageRefSchema,
});

/**
 * The standalone Home Collection slot (mirrors
 * `HomeCollectionFeatureWriteInput`): it owns its content outright, so every
 * field is required rather than clearable — there is no linked entity to fall
 * back to.
 */
export const homeCollectionFeatureFormSchema = z.object({
  enabled: enabledSchema,
  image: imageRefSchema,
  title: localizedSchema,
  text: localizedSchema,
});

/**
 * The catalogue slot (mirrors `CatalogueFeatureWriteInput`): the section's
 * title and PDF link come from the referenced catalogue item, so the slot only
 * selects the item and owns the photo.
 */
export const catalogueFeatureFormSchema = z.object({
  enabled: enabledSchema,
  /** CatalogueItem.id */
  catalogueItemId: idSchema,
  image: imageRefSchema,
  /**
   * The section's paragraph blocks. Optional: an empty list means "use the
   * static `catalogue.description` translation", which is what every row saved
   * before this field existed does.
   */
  paragraphs: clearableLocalizedListSchema,
  /**
   * The CTA's own label, per language. An empty pair falls back to the composed
   * default (`t("catalogue.download") + CatalogueItem.title`).
   */
  ctaLabel: clearableLocalizedSchema,
  /**
   * The CTA's destination override. A SINGLE shared URL — this project keeps one
   * address per link (see `CatalogueItem.href`). Empty falls back to it.
   */
  ctaHref: clearableLinkSchema,
  /**
   * An UPLOADED pdf (Pass C.4). Same reference shape as an image: the absolute
   * https URL of a stored object, or "" when not configured. Empty falls back to
   * `ctaHref` and then to `CatalogueItem.href`.
   *
   * This is the FIELD the operator fills by uploading, and it outranks
   * `ctaHref` — a file they chose is more specific than an address they pasted.
   */
  ctaPdfUrl: clearableImageRefSchema,
  /**
   * The uploaded file's presentable name, used for the download's filename.
   * Only meaningful alongside a URL; the action nulls it whenever the URL is
   * cleared, so the two columns can never disagree.
   */
  ctaPdfName: z.string().max(NAME_MAX),
});

/**
 * The hero (Pass D.1) — components/home/HeroSection.tsx.
 *
 * The hero references no catalog entity, so every field is an OVERRIDE of
 * something the component already renders: the two headline lines and the CTA
 * label come from the `hero.*` dictionary keys, and the CTA target from the
 * component's own `/catalogue` default. All of them are clearable, and clearing
 * means "keep using that built-in" — which is why an untouched hero form saves
 * nothing and changes nothing.
 *
 * The MEDIA is the exception: the shipped `/videos/hero.mp4` +
 * `/videos/hero-poster.jpg` assets were deleted by the operator (Pass D.1
 * follow-up), so an empty `videoUrl`/`posterUrl` now means "no video / no
 * poster" rather than "the stock film".
 */
export const heroFeatureFormSchema = z.object({
  enabled: enabledSchema,
  /** Hero video. Empty = no video (there is no stock film any more). */
  videoUrl: clearableMediaRefSchema,
  /** Poster frame. Empty = no poster. */
  posterUrl: clearableMediaRefSchema,
  /** The h1 line. An empty pair = `t("hero.collection")`. */
  firstLine: clearableLocalizedSchema,
  /** The h2 line. An empty pair = `t("hero.ritualGravity")`. */
  secondLine: clearableLocalizedSchema,
  /** The CTA button label. An empty pair = `t("hero.readMore")`. */
  ctaLabel: clearableLocalizedSchema,
  /**
   * The CTA destination. Validated by the project's safe-link allow-list
   * (`clearableLinkSchema`), NOT by the media-ref rule: a button goes to a page,
   * so a root-relative route is the normal case. Empty = `/catalogue`.
   */
  ctaHref: clearableLinkSchema,
});

/**
 * The video section (Pass D.1) — components/home/VideoSection.tsx.
 *
 * Its configurable content is the media: the video and the poster frame painted
 * before it starts. The placeholder copy, layout, scroll-triggered loading and
 * play/pause behaviour are untouched. An empty `videoUrl` means NO video — the
 * stock `/videos/afterhenge.mp4` was deleted by the operator (Pass D.1
 * follow-up) — and the section is then not rendered. An empty `posterUrl`
 * leaves the section's own placeholder copy in place until the video plays.
 */
export const videoFeatureFormSchema = z.object({
  enabled: enabledSchema,
  videoUrl: clearableMediaRefSchema,
  posterUrl: clearableMediaRefSchema,
});

export type FlagshipOneFeatureFormValues = z.infer<
  typeof flagshipOneFeatureFormSchema
>;
export type ProjectBannerFeatureFormValues = z.infer<
  typeof projectBannerFeatureFormSchema
>;
export type ProjectDarkBackgroundFeatureFormValues = z.infer<
  typeof projectDarkBackgroundFeatureFormSchema
>;
export type HomeCollectionFeatureFormValues = z.infer<
  typeof homeCollectionFeatureFormSchema
>;
export type CatalogueFeatureFormValues = z.infer<
  typeof catalogueFeatureFormSchema
>;
export type HeroFeatureFormValues = z.infer<typeof heroFeatureFormSchema>;
export type VideoFeatureFormValues = z.infer<typeof videoFeatureFormSchema>;
