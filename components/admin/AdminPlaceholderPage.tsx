import Link from "@/lib/i18n/Link";
import { isLocale } from "@/lib/i18n/routing";
import { translations, type TranslationKey } from "@/lib/i18n/translations";
import { notFound } from "next/navigation";

/**
 * Placeholder body for admin sections whose CRUD screens are not built yet.
 *
 * Instructions:
 *   - `labelKey` is a translation key (e.g. "admin.nav.products"), never a
 *     hardcoded string, so the section name renders in the page's language.
 *   - The page owns its one and only heading (an <h2>, same pattern as the
 *     dashboard page) — the topbar breadcrumb must never duplicate it.
 *   - The "coming soon" card below is the shared placeholder state; keep it
 *     deliberate-looking (card, eyebrow, description, back link) rather than
 *     letting a section render a bare unstyled string.
 */
export default async function AdminPlaceholderPage({
  params,
  labelKey,
}: {
  params: Promise<{ locale: string }>;
  labelKey: TranslationKey;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = translations[locale === "en" ? "en" : "fa"];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-semibold">{t[labelKey]}</h2>
      </div>

      <div className="border-border bg-card flex min-h-[50vh] items-center justify-center rounded-2xl border p-8 text-center shadow-sm">
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
            {t["admin.placeholder.title"]}
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            {t["admin.placeholder.description"]}
          </p>
          <Link
            href="/admin"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition"
          >
            {t["admin.placeholder.back"]}
          </Link>
        </div>
      </div>
    </div>
  );
}
