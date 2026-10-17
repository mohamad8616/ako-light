import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialItemsTable } from "@/components/admin/catalog/materials/MaterialItemsTable";
import { getMaterialCategoryAdminRows } from "@/lib/repositories/material-categories";
import { getMaterialItemAdminRows } from "@/lib/repositories/material-items";

export default async function MaterialItemsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [rows, categories] = await Promise.all([
    getMaterialItemAdminRows(),
    getMaterialCategoryAdminRows(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.materialItems"
          descriptionKey="admin.section.materialItems.description"
        />
        <MaterialItemsTable rows={rows} categories={categories} />
      </div>
    </div>
  );
}
