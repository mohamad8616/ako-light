import { z } from "zod";
import type { S34SectionKey } from "@/lib/repositories/s34-page";
import { localizedSchema } from "./common";

/**
 * S34-page section schemas (myPlan.md Part D).
 *
 * One schema per `S34PageSection` row, mirroring the content shapes the
 * repository returns (lib/repositories/s34-page.ts). Fields are NOT clearable —
 * a section row owns its copy outright — so every localized half is required.
 *
 * The three kicker sections (concept / gallery / harmony) genuinely share one
 * shape, so they share one schema; the hero differs (title + subtitle).
 * `s34SectionSchemas` is the ACTIONS' dispatch table, pinned to the
 * repository's key union with `satisfies` so a new section cannot be added
 * without rules.
 *
 * Schemas carry NO per-field prose (rule from ./common): the action maps each
 * issue's path + code to a translated `admin.error.*` key.
 */

/** components/s34/S34Hero.tsx — `s34.hero.title` / `.subtitle`. */
export const s34HeroSectionSchema = z.object({
  title: localizedSchema,
  subtitle: localizedSchema,
});

/**
 * components/s34/S34Concept.tsx, Secuence.tsx, S34Harmony.tsx — a kicker heading
 * over a paragraph list (`s34.concept.*`, `s34.gallery.*`, `s34.harmony.*`).
 */
export const s34KickerSectionSchema = z.object({
  kicker: localizedSchema,
  paragraphs: z.array(localizedSchema),
});

/** sectionKey -> rules, for the action's `sectionKey` dispatch. */
export const s34SectionSchemas = {
  heroSection: s34HeroSectionSchema,
  conceptSection: s34KickerSectionSchema,
  gallerySection: s34KickerSectionSchema,
  harmonySection: s34KickerSectionSchema,
} satisfies Record<S34SectionKey, z.ZodType>;

export type S34HeroSectionFormValues = z.infer<typeof s34HeroSectionSchema>;
export type S34KickerSectionFormValues = z.infer<typeof s34KickerSectionSchema>;