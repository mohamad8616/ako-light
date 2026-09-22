/**
 * Slug helpers shared by the admin forms (client) and the server actions.
 *
 * Pure functions only — no React, no Prisma, no "use server" — so the same
 * default-slug rule runs on both sides and can never drift. Note the Persian
 * limitation: this only produces Latin slugs, so a Persian-only name yields an
 * empty result and the form asks the editor to type one (the zod schema then
 * enforces a non-empty value). A transliteration map would be a separate,
 * deliberate addition.
 */

/**
 * Converts any display string into a URL-safe slug: NFKD-normalised, diacritics
 * stripped, lowercased, and every run of non-alphanumerics collapsed to one
 * hyphen (leading/trailing hyphens removed).
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whether a string is already in canonical slug form (what `slugSchema` wants). */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * The default slug for a new row, derived from its display name. The English
 * value wins; the Persian one is only a fallback for entities whose fields are
 * plain strings. Returns "" when neither produces a usable slug — the caller
 * (SlugField) then leaves the field empty for the editor to fill.
 */
export function defaultSlugFromName(en: string, fa = ""): string {
  return slugify(en) || slugify(fa);
}
