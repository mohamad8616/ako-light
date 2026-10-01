"use client";

import { adminTranslations } from "@/lib/i18n/admin-translations";
import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Adds the admin-only strings to the language context for the admin subtree.
 *
 * The public `LanguageProvider` in `app/[locale]/layout.tsx` deliberately does
 * NOT contain `admin.ts` (~43 KB) — it wraps the whole app, including every
 * public page, so carrying admin strings there shipped them to every visitor.
 * Admin screens do need those strings, so this component re-provides the same
 * context with the admin dictionary merged on top; the innermost provider wins
 * for everything below it.
 *
 * The bundle win comes from where this is MOUNTED: only
 * `app/[locale]/(admin)/layout.tsx` renders it, so `admin-translations.ts` and
 * the ~43 KB behind it land in a chunk that only admin routes ever fetch. A
 * public visitor's browser never downloads it.
 *
 * It reads `lang` from the parent provider rather than taking a prop, so the
 * admin shell cannot disagree with the route about the active locale.
 */
export default function AdminLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang } = useLanguage();

  return (
    <LanguageProvider locale={lang} extra={adminTranslations[lang]}>
      {children}
    </LanguageProvider>
  );
}
