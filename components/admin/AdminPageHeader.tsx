import { isLocale, type Locale } from "@/lib/i18n/routing";
import { translations, type TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

/**
 * The one heading every admin section page renders.
 *
 * Server component on purpose (same pattern as AdminPlaceholderPage): the page
 * resolves its own locale and dictionary, so the heading is rendered on the
 * server and the client screens stay chrome-free. Exactly one heading per page
 * — the shell (topbar/sidebar) must never duplicate it.
 *
 * `titleKey`/`descriptionKey` are translation keys, never raw copy. `actions`
 * is a slot for the section's create button (a client component rendered by
 * the page, passed through as children — RSC-safe).
 */
export function AdminPageHeader({
  locale,
  titleKey,
  descriptionKey,
  actions,
  className,
}: {
  locale: string;
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  actions?: React.ReactNode;
  className?: string;
}) {
  const lang: Locale = isLocale(locale) ? locale : "fa";
  const t = translations[lang];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {t[titleKey]}
        </h2>
        {descriptionKey ? (
          <p className="text-muted-foreground text-sm">{t[descriptionKey]}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
