import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductCategoriesTable } from "@/components/admin/catalog/product-categories/ProductCategoriesTable";
import { getProductCategoryAdminRows } from "@/lib/repositories/product-categories";

/**
 * The categories list — the dashboard's DataTable wired into real use.
 *
 * Server component on purpose: the rows are read here once per request and
 * passed down to the client table (the DTOs are plain and serializable —
 * Decimal/Date never cross the boundary).
 */
export default async function ProductCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getProductCategoryAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.categories"
          descriptionKey="admin.section.categories.description"
        />
        <ProductCategoriesTable rows={rows} />
      </div>
    </div>
  );
}