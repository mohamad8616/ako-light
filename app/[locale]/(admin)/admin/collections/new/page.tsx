import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { CollectionForm } from "@/components/admin/catalog/collections/CollectionForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getCollectionAdminDetail } from "@/lib/repositories/collections";
import { notFound } from "next/navigation";

/**
 * Create-collection page.
 */
export default async function NewCollectionPage({
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
          titleKey="admin.collection.new"
          descriptionKey="admin.section.collections.description"
          actions={
            <BackLink
              href="/admin/collections"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.collections"]}`}
            />
          }
        />
        <CollectionForm />
      </div>
    </div>
  );
}