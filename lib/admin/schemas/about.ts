import { z } from "zod";
import type { AboutSectionKey } from "@/lib/repositories/about-page";
import { localizedSchema, imageRefSchema } from "./common";

/**
 * About-page section schemas (myPlan.md Part D).
 *
 * One schema per `AboutPageSection` row, mirroring the content shapes the
 * repository returns (lib/repositories/about-page.ts). Unlike the homepage
 * override schemas these fields are NOT clearable: a section row owns its copy
 * outright, so every field is required and a half-translated pair surfaces on
 * its empty half — exactly like `localizedSchema` everywhere else.
 *
 * `aboutSectionSchemas` is the ACTIONS' dispatch table: keyed by `sectionKey`
 * and pinned to the repository's key union with `satisfies`, so adding a
 * section without a schema (or vice versa) is a type error rather than a row
 * the dashboard silently cannot save.
 *
 * Schemas carry NO per-field prose (rule from ./common): the action maps each
 * issue's path + code to a translated `admin.error.*` key.
 */

/** components/about/AboutHero.tsx — `about.hero.firstLine` / `.secondLine`. */
export const aboutHeroSectionSchema = z.object({
  firstLine: localizedSchema,
  secondLine: localizedSchema,
});

/** components/about/AboutHeroVideo.tsx — the paragraph under the hero. */
export const aboutSubtitleSectionSchema = z.object({
  paragraph: localizedSchema,
});

/**
 * components/about/BrandStory.tsx — title, the intro grid, both editable image
 * URLs, and the image blocks' alt text + paragraphs.
 */
export const aboutBrandStorySectionSchema = z.object({
  title: localizedSchema,
  block1Image: z.string().trim().min(1).max(2048),
  block2Image: z.string().trim().min(1).max(2048),
  paragraphs: z.array(localizedSchema),
  block1Alt: localizedSchema,
  block1Paragraphs: z.array(localizedSchema),
  block2Alt: localizedSchema,
  block2Paragraph: localizedSchema,
});

/**
 * components/ui/imageGalleryCarousel on `/about` — the ordered photo list.
 *
 * NOT clearable and NOT bounded in count: the operator picks however many
 * photos the section should show, and the carousel renders exactly those in
 * order. An EMPTY list is allowed on purpose — removing every row is how the
 * gallery is taken off the page — which is why this is a plain array of the
 * shared image primitive rather than a `.min(1)`-guarded list.
 */
export const aboutGallerySectionSchema = z.object({
  images: z
    .array(imageRefSchema.or(z.literal("")))
    // A row the operator added but has not filled yet holds "". Blanks are
    // dropped HERE — after the URL check, so a genuinely malformed entry is
    // still reported on its own row — which makes "+ add" followed by Save a
    // no-op instead of a validation error. The gallery takes any number of
    // photos, including none, so a half-filled row is not worth blocking on.
    .transform((list) => list.filter((image) => image !== "")),
});

/** components/about/EleganceSection.tsx — title + `about.elegance.p1..p3`. */
export const aboutEleganceSectionSchema = z.object({
  title: localizedSchema,
  paragraphs: z.array(localizedSchema),
});

/** schemaKey -> rules, for the action's `sectionKey` dispatch. */
export const aboutSectionSchemas = {
  heroSection: aboutHeroSectionSchema,
  subtitleSection: aboutSubtitleSectionSchema,
  brandStorySection: aboutBrandStorySectionSchema,
  gallerySection: aboutGallerySectionSchema,
  eleganceSection: aboutEleganceSectionSchema,
} satisfies Record<AboutSectionKey, z.ZodType>;

export type AboutHeroSectionFormValues = z.infer<typeof aboutHeroSectionSchema>;
export type AboutSubtitleSectionFormValues = z.infer<
  typeof aboutSubtitleSectionSchema
>;
export type AboutBrandStorySectionFormValues = z.infer<
  typeof aboutBrandStorySectionSchema
>;
export type AboutGallerySectionFormValues = z.infer<
  typeof aboutGallerySectionSchema
>;
export type AboutEleganceSectionFormValues = z.infer<
  typeof aboutEleganceSectionSchema
>;