import { z } from "zod";
import type { AboutSectionKey } from "@/lib/repositories/about-page";
import { localizedSchema } from "./common";

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
 * components/about/BrandStory.tsx — title, the intro grid, and both image
 * blocks (alt text + paragraphs). The images themselves stay in
 * lib/data/about.ts; only their localized copy is editable here.
 */
export const aboutBrandStorySectionSchema = z.object({
  title: localizedSchema,
  paragraphs: z.array(localizedSchema),
  block1Alt: localizedSchema,
  block1Paragraphs: z.array(localizedSchema),
  block2Alt: localizedSchema,
  block2Paragraph: localizedSchema,
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
  eleganceSection: aboutEleganceSectionSchema,
} satisfies Record<AboutSectionKey, z.ZodType>;

export type AboutHeroSectionFormValues = z.infer<typeof aboutHeroSectionSchema>;
export type AboutSubtitleSectionFormValues = z.infer<
  typeof aboutSubtitleSectionSchema
>;
export type AboutBrandStorySectionFormValues = z.infer<
  typeof aboutBrandStorySectionSchema
>;
export type AboutEleganceSectionFormValues = z.infer<
  typeof aboutEleganceSectionSchema
>;