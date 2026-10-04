/**
 * Admin-only translation dictionary.
 *
 * WHY THIS IS A SEPARATE MODULE FROM `./translations` (the public barrel)
 *
 * `admin.ts` is ~43 KB — roughly 40 % of the whole dictionary — and every string
 * in it is read only by the admin dashboard. But `LanguageProvider` is a
 * `"use client"` component that used to import the combined barrel, and it is
 * rendered by `app/[locale]/layout.tsx`, which wraps BOTH `(site)` and
 * `(admin)`. So the admin half was shipped to every visitor of every public
 * page, to be parsed and kept in memory for strings those pages can never
 * render.
 *
 * Splitting it here does not merely tidy the imports: because the bundle
 * boundary follows the module graph, and only `AdminLanguageProvider` (mounted
 * inside the `(admin)` layout) imports this file, the admin strings now land in
 * a chunk that only admin routes fetch.
 *
 * The one thing that must NOT live here is anything a public page reads. The
 * only such case was the sign-in page's access-denied message, which now lives
 * in `./translations/auth` as `auth.access.denied.*` — see the note there.
 */
import { translations, type Language } from "./translations";
import { adminTranslations } from "./admin-strings";

/**
 * The admin dictionary, re-exported for existing server-side importers and for
 * the unit tests that assert its shape.
 *
 * The definition lives in `./admin-strings`, which imports nothing but the admin
 * dictionary. It has to: the CLIENT (`AdminLanguageProvider`) imports the
 * dictionary, and anything this module imports lands in the admin client chunk.
 * While `adminTranslations` was defined HERE it dragged the public
 * `translations` object into that chunk — see the note in `./admin-strings`.
 */
export { adminTranslations } from "./admin-strings";
export type { AdminOnlyKey, AdminTranslationKey } from "./admin-strings";

/**
 * Public ∪ admin, merged once at module load.
 *
 * Computed eagerly rather than per call because admin pages resolve this in
 * server components that can render on every request; the two locales are fixed
 * at build time, so there is nothing request-specific to recompute.
 */
const merged: Record<Language, Record<string, string>> = {
  en: { ...translations.en, ...adminTranslations.en },
  fa: { ...translations.fa, ...adminTranslations.fa },
};

/**
 * The dictionary an admin SERVER component should read from.
 *
 * Server-only by convention: client admin components get the same merge through
 * `AdminLanguageProvider` + `useLanguage().t`, which is what keeps this module
 * out of the public client graph.
 */
export function getAdminDictionary(locale: Language): Record<string, string> {
  return merged[locale];
}
