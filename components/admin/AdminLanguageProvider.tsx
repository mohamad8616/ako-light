"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Installs the admin dictionary for the admin subtree.
 *
 * The dictionary arrives as a PROP, selected by the server in
 * `app/[locale]/(admin)/layout.tsx` from `params.locale`. It used to be picked
 * here with `adminTranslations[lang]`, which is the same runtime-index-into-a-
 * static-object shape that kept BOTH locales in the client chunk: measured
 * 28,273 gz for the admin pair, of which one locale was always dead weight.
 * Moving the selection to the server removes the dictionary from the client JS
 * graph entirely — it travels in the RSC payload, once per locale (a shared
 * layout is not re-fetched on client navigation).
 *
 * This is also why nothing here imports `admin-strings` or `admin-translations`:
 * a `"use client"` module's imports land in the admin client chunk, and
 * `admin-translations` reaches the PUBLIC dictionary through
 * `getAdminDictionary()`. Admin screens resolve only `admin.*` keys — verified:
 * 297 admin keys, 0 public keys, including every dynamic lookup and the
 * `labelKey`/`hintKey` metadata in lib/admin/*.
 */
export default function AdminLanguageProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider locale={locale} dictionary={dictionary}>
      {children}
    </LanguageProvider>
  );
}
