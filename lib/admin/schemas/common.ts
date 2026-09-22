import { z } from "zod";

/**
 * Shared zod primitives for the admin form schemas.
 *
 * Rules only — NO per-field prose: the server action maps each issue's zod code
 * to a translated dictionary key (see lib/admin/result.ts), so changing a rule
 * never needs a translation change and the Persian-first admin never renders
 * English validation prose.
 *
 * Numbers arrive as real numbers (forms register numeric inputs with
 * `valueAsNumber: true`); there is deliberately NO `z.coerce`, so `z.input`
 * equals `z.output` and `zodResolver` types react-hook-form exactly.
 *
 * Localized values require BOTH `en` and `fa`: the DB-backed tests enforce
 * non-empty pairs for every seeded localized column, so a half-localized row is
 * surfaced as a field error instead of silently persisting data debt (the site
 * falls back to `en` at render time anyway).
 */

/** { en, fa } — the exact shape every localized jsonb column stores. */
export const localizedSchema = z.object({
  en: z.string().min(1),
  fa: z.string().min(1),
});

/** Localized[] — bio / moreDescription style paragraph lists. */
export const localizedListSchema = z.array(localizedSchema);

/**
 * A Localized-or-plain-string entry (`Project.credits`,
 * `FlagshipDetail.info.addressLines`): the source data genuinely mixes both
 * forms, and the render layer resolves plain strings for every language.
 */
export const mixedLocalizedSchema = z.union([
  localizedSchema,
  z.string().min(1),
]);

/** Canonical slug: lowercase alphanumerics with single hyphens, no edges. */
export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * A link target. The real data mixes three forms and all of them must stay
 * saveable: absolute https URLs (catalogue PDFs, designer websites),
 * root-relative paths (the designer download links), and "#" placeholders.
 */
export const linkSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      /^https?:\/\//.test(value) || value.startsWith("/") || value === "#",
  );

/** An image/file reference — absolute https or a root-relative path. */
export const imageRefSchema = z
  .string()
  .min(1)
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"));

/** Hex colour with a leading "#", 3/6/8 digits (swatches, catalogue covers). */
export const hexColorSchema = z
  .string()
  .min(1)
  .regex(/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?$/);

/** Zero-based display position. */
export const sortOrderSchema = z.number().int().min(0);

/** Any non-empty plain string (names, codes, ids, i18n keys, phone/email). */
export const nonEmptySchema = z.string().min(1);
