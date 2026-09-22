import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialsTable } from "@/components/admin/catalog/materials/MaterialsTable";
import { getMaterialAdminRows } from "@/lib/repositories/materials";

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getMaterialAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.materials"
          descriptionKey="admin.section.materials.description"
        />
        <MaterialsTable rows={rows} />
      </div>
    </div>
  );
}