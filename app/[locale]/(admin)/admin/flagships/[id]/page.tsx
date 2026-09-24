import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { FlagshipForm } from "@/components/admin/catalog/flagships/FlagshipForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getFlagshipAdminDetail } from "@/lib/repositories/flagships";
import { notFound } from "next/navigation";

/**
 * Edit-flagship page. Unknown ids 404 (the row may have been deleted under the
 * editor); the literal "new" also 404s so a routing change can never render
 * this form against a non-row.
 */
export default async function EditFlagshipPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (id === "new") notFound();

  const t = translations[locale];
  const detail = await getFlagshipAdminDetail(id);
  if (!detail) notFound();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.flagship.edit"
          descriptionKey="admin.section.flagships.description"
          actions={
            <BackLink
              href="/admin/flagships"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.flagships"]}`}
            />
          }
        />
        <FlagshipForm detail={detail} id={id} />
      </div>
    </div>
  );
}
