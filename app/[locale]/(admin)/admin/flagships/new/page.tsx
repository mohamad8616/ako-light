import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { FlagshipForm } from "@/components/admin/catalog/flagships/FlagshipForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { notFound } from "next/navigation";

/**
 * Create-flagship page. The slug auto-derives from the English name while
 * untouched, and the detail block starts ABSENT (toggle off → SQL NULL), so a
 * summary-only store can be saved without a detail page.
 */
export default async function NewFlagshipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = translations[locale];

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.flagship.new"
          descriptionKey="admin.section.flagships.description"
          actions={
            <BackLink
              href="/admin/flagships"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.flagships"]}`}
            />
          }
        />
        <FlagshipForm />
      </div>
    </div>
  );
}
