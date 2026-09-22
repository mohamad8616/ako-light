import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductsTable } from "@/components/admin/catalog/products/ProductsTable";
import { getProductAdminRows } from "@/lib/repositories/products";

/**
 * The products list — the dashboard's DataTable wired into real use for the
 * first time: the section's rows with its own columns (name, category,
 * designer, price, stock, display order), sorting and pagination.
 *
 * Server component on purpose: the rows are read here once per request and
 * passed down to the client table (the DTOs are plain and serializable —
 * Decimal/Date never cross the boundary).
 */
export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getProductAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.products"
          descriptionKey="admin.section.products.description"
        />
        <ProductsTable rows={rows} />
      </div>
    </div>
  );
}
