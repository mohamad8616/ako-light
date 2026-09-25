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
 *
 * LENGTHS ARE CAPPED. Every string primitive carries a GENEROUS `.max()` (a
 * control that cannot say "too long" accepts an unbounded payload into a jsonb
 * column and into every downstream render). The caps are ceilings, not content
 * rules: they sit far above any real value (the longest seeded localized
 * paragraph is well under 2000 characters, the longest image path is a few
 * hundred), so nothing legitimate is rejected — only the abuse case is.
 */

/**
 * Length caps, in characters, shared by the primitives below so the whole schema
 * set answers "how long may this be?" consistently.
 *
 *   - {@link TEXT_MAX} — one prose paragraph / field label.
 *   - {@link NAME_MAX} — names, titles, cities, kickers: never prose.
 *   - {@link URL_MAX} — URLs and root-relative paths (2048 covers every real
 *     CDN path/query string by an order of magnitude).
 *   - {@link ID_MAX} — opaque ids (cuid/uuid) and i18n keys.
 *   - {@link CREDIT_MAX} — a credit/attribution line (a step above a name).
 *   - {@link YEAR_MAX} — the four-digit year the data stores as a string.
 *   - {@link PHONE_MAX} / {@link EMAIL_MAX} — flagship contact details.
 *   - {@link COLOR_MAX} — "#" + 8 hex digits, with room to spare.
 *   - {@link SLUG_MAX} — route handles; the longest seeded slug is a handful
 *     of words, so a 2048-char handle is a DoS lever, not a slug.
 */
export const TEXT_MAX = 2000;
export const NAME_MAX = 300;
export const URL_MAX = 2048;
export const ID_MAX = 200;
export const CREDIT_MAX = 500;
export const YEAR_MAX = 10;
export const PHONE_MAX = 40;
export const EMAIL_MAX = 254;
export const COLOR_MAX = 16;
export const SLUG_MAX = 200;

/** { en, fa } — the exact shape every localized jsonb column stores. */
export const localizedSchema = z.object({
  en: z.string().min(1).max(TEXT_MAX),
  fa: z.string().min(1).max(TEXT_MAX),
});

/** Localized[] — bio / moreDescription style paragraph lists. */
export const localizedListSchema = z.array(localizedSchema);

/** A credit/attribution line, in either representation (`Project.credits`). */
export const creditSchema = z.string().min(1).max(CREDIT_MAX);

/** A Localized-or-plain-string entry, both halves length-capped. */
export const mixedLocalizedSchema = z.union([
  localizedSchema,
  creditSchema,
]);

/** Canonical slug: lowercase alphanumerics with single hyphens, no edges. */
export const slugSchema = z
  .string()
  .min(1)
  .max(SLUG_MAX)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * A link target. The real data mixes three forms and all of them must stay
 * saveable: absolute https URLs (catalogue PDFs, designer websites),
 * root-relative paths (the designer download links), and "#" placeholders.
 */
export const linkSchema = z
  .string()
  .min(1)
  .max(URL_MAX)
  .refine(
    (value) =>
      /^https?:\/\//.test(value) || value.startsWith("/") || value === "#",
  );

/** An image/file reference — absolute https or a root-relative path. */
export const imageRefSchema = z
  .string()
  .min(1)
  .max(URL_MAX)
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"));

/** Hex colour with a leading "#", 3/6/8 digits (swatches, catalogue covers). */
export const hexColorSchema = z
  .string()
  .min(1)
  .max(COLOR_MAX)
  .regex(/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?$/);

/** An opaque row id (cuid/uuid) — e.g. a product id inside a join list. */
export const idSchema = z.string().min(1).max(ID_MAX);

/** A translation-key prefix, e.g. "projects.hIstra". */
export const i18nKeySchema = z.string().min(1).max(ID_MAX);

/** A display name / short label (names, titles, cities, categories, codes). */
export const nameSchema = z.string().min(1).max(NAME_MAX);

/** A contact phone number as stored by the flagship detail block. */
export const phoneSchema = z.string().min(1).max(PHONE_MAX);

/** A contact e-mail address as stored by the flagship detail block. */
export const emailSchema = z.string().min(1).max(EMAIL_MAX);

/** A four-digit year stored as a string ("2026"), never a number. */
export const yearSchema = z.string().min(1).max(YEAR_MAX);

/** Zero-based display position. */
export const sortOrderSchema = z.number().int().min(0);

/**
 * Any non-empty plain string (names, codes, ids, i18n keys, phone/email).
 *
 * Kept as the lenient fallback for genuinely free-form values so it can never
 * reject real data; prefer a narrower primitive above when the field's shape is
 * known ({@link nameSchema}, {@link idSchema}, {@link phoneSchema}, …).
 */
export const nonEmptySchema = z.string().min(1).max(TEXT_MAX);
