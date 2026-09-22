import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CatalogueTable } from "@/components/admin/catalog/catalogue/CatalogueTable";
import { getCatalogueItemAdminRows } from "@/lib/repositories/catalogue";

export default async function CataloguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getCatalogueItemAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.catalogue"
          descriptionKey="admin.section.catalogue.description"
        />
        <CatalogueTable rows={rows} />
      </div>
    </div>
  );
}