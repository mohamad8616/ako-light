import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CollectionTable } from "@/components/admin/catalog/collections/CollectionTable";
import { getCollectionAdminRows } from "@/lib/repositories/collections";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getCollectionAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.collections"
          descriptionKey="admin.section.collections.description"
        />
        <CollectionTable rows={rows} />
      </div>
    </div>
  );
}
