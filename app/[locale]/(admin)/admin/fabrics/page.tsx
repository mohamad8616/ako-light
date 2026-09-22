import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FabricsTable } from "@/components/admin/catalog/fabrics/FabricsTable";
import { getFabricItemAdminRows } from "@/lib/repositories/fabrics";

export default async function FabricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getFabricItemAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.fabrics"
          descriptionKey="admin.section.fabrics.description"
        />
        <FabricsTable rows={rows} />
      </div>
    </div>
  );
}