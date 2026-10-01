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
import {
  translations,
  type Language,
  type TranslationKey,
} from "./translations";
import { adminEn, adminFa } from "./translations/admin";

/** The admin strings for each locale, kept out of the public barrel. */
export const adminTranslations: Record<Language, Record<string, string>> = {
  en: adminEn,
  fa: adminFa,
};

/** Keys that exist ONLY in the admin dictionary. */
export type AdminOnlyKey = keyof typeof adminEn;

/**
 * Every key an admin screen may render.
 *
 * Admin screens legitimately use both halves — a heading from `admin.*` next to
 * a shared `common.*` label — so the admin type is the union rather than just
 * the admin keys. Public code must keep using `TranslationKey`, which stays
 * admin-free and is what keeps the split honest.
 */
export type AdminTranslationKey = TranslationKey | AdminOnlyKey;

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
