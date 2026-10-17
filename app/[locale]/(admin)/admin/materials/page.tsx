import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialCategoriesTable } from "@/components/admin/catalog/materials/MaterialCategoriesTable";
import { getMaterialCategoryAdminRows } from "@/lib/repositories/material-categories";

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getMaterialCategoryAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.materials"
          descriptionKey="admin.section.materials.description"
        />
        <MaterialCategoriesTable rows={rows} />
      </div>
    </div>
  );
}