import { translations, type Language } from "./translations";

/**
 * The dictionary for the small part of the tree that sits ABOVE both route
 * groups.
 *
 * `app/[locale]/layout.tsx` mounts the LanguageProvider for the whole locale
 * subtree, but the only `useLanguage()` consumer above (site) and (admin) is
 * `app/[locale]/not-found.tsx` — an unmatched URL renders it with just this
 * layout as an ancestor. Every page inside a route group gets a full dictionary
 * from that group's own layout instead:
 *
 *   (site)  → app/[locale]/(site)/layout.tsx          (public dictionary)
 *   (admin) → components/admin/AdminLanguageProvider  (admin dictionary)
 *
 * So this shell only has to cover the not-found screen. Keeping it to an
 * explicit list is the point: it is the ONE dictionary that reaches every route
 * in the app, so it must stay tiny. Add a key here only when a component
 * rendered outside both route groups needs it.
 *
 * Server-only by construction — it imports `translations`. Never import it from
 * a `"use client"` module, or the full public dictionary returns to the client
 * graph for every route.
 */
const SHELL_KEYS = [
  "notFound.title",
  "notFound.subtitle",
  "notFound.backHome",
] as const;

function shellFor(locale: Language): Record<string, string> {
  const all = translations[locale] as Record<string, string>;
  const shell: Record<string, string> = {};
  for (const key of SHELL_KEYS) shell[key] = all[key];
  return shell;
}

export const shellTranslations: Record<Language, Record<string, string>> = {
  en: shellFor("en"),
  fa: shellFor("fa"),
};
