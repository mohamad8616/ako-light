import { z } from "zod";
import {
  idSchema,
  imageRefSchema,
  localizedSchema,
  TEXT_MAX,
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

/** An override pair the admin can also clear: both filled, or both empty. */
export const clearableLocalizedSchema = z
  .object({ en: z.string().max(TEXT_MAX), fa: z.string().max(TEXT_MAX) })
  // A half-translated pair is a mistake, not a partial override: each empty
  // half carries its own issue so the field shows the translated "required".
  .refine((value) => !(value.en === "" && value.fa !== ""), { path: ["en"] })
  .refine((value) => !(value.fa === "" && value.en !== ""), { path: ["fa"] });

/**
 * `Localized[]` override (paragraphs): rows are added and removed, and an empty
 * list means "cleared". Rows themselves must be complete — the form seeds a new
 * row empty on purpose, so a forgotten row surfaces as a field error instead of
 * silently becoming a NULL override.
 */
export const clearableLocalizedListSchema = z.array(localizedSchema);

/** Image override: an empty string means "cleared" (read the entity's image). */
export const clearableImageRefSchema = z.union([
  imageRefSchema,
  z.literal(""),
]);

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
