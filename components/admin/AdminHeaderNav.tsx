"use client";

import { Separator } from "@/components/ui/separator";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { locales } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

/**
 * The admin shell's compact navigation: a link to the public site and a
 * language switcher (Pass D.1).
 *
 * ── Why the home link does not need a sign-out ──────────────────────────────
 *
 * The public site is a different route group with its own layout; opening it
 * neither reads nor clears the admin session, so an operator can check what
 * they just published and come back without losing their place. The link is a
 * plain anchor through the locale-aware `Link`, so it goes to `/` on the
 * unprefixed (English) tree and `/fa` on the Persian one — never to the
 * dashboard, and never to a legacy `/en/...` URL, because `getLocalizedPath`
 * emits the default locale WITHOUT a prefix.
 *
 * ── Why the switcher reuses `setLang` ───────────────────────────────────────
 *
 * `useLanguage().setLang` already implements exactly this: it navigates to the
 * SAME pathname in the other locale and remembers the choice. Re-implementing
 * it here would be a second place that knows the routing rules, which is the
 * one thing this codebase is careful to keep single-sourced. Because the admin
 * lives in the same `[locale]` route tree as the public site, every admin path
 * has an equivalent in both languages, so switching can never land on a
 * missing route.
 *
 * ── Layout ──────────────────────────────────────────────────────────────────
 *
 * `ms-auto` puts the group at the inline END, so it mirrors with the shell's
 * direction (which is RTL for both locales — see lib/admin/sections.ts) without
 * the component knowing or caring which way that is. The controls are real
 * `<button>`s with `aria-pressed`, so they are reachable and announced without
 * a menu, a portal, or a tooltip provider.
 */
export function AdminHeaderNav() {
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="ms-auto flex items-center gap-1 lg:gap-2">
      <LocaleLink
        href="/"
        title={t("admin.header.home")}
        className="text-background/80 hover:text-background focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2"
      >
        <Home aria-hidden="true" className="size-4 shrink-0" />
        {/* The label collapses to the icon on narrow screens. */}
        <span className="hidden sm:inline">{t("admin.header.home")}</span>
      </LocaleLink>

      <Separator
        orientation="vertical"
        className="bg-background mx-1 h-4 data-vertical:self-auto"
      />

      <div
        role="group"
        aria-label={t("admin.header.language")}
        className="border-background/30 flex items-center overflow-hidden rounded-md border"
      >
        {locales.map((locale) => {
          const active = locale === lang;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => setLang(locale)}
              // The current language is already the page's language, so
              // re-selecting it is a no-op (setLang returns early).
              aria-pressed={active}
              aria-label={t(
                locale === "en" ? "admin.header.lang.en" : "admin.header.lang.fa",
              )}
              className={cn(
                "focus-visible:ring-ring px-2 py-1 text-[11px] font-medium uppercase transition-colors outline-none focus-visible:ring-2",
                active
                  ? "bg-background text-foreground"
                  : "text-background/70 hover:text-background",
              )}
            >
              {locale}
            </button>
          );
        })}
      </div>
    </div>
  );
}
