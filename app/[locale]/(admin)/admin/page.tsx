import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ChartAreaInteractive } from "@/components/admin/dashboard/chart-area-interactive";
import {
  DataTable,
  type DashboardProductRow,
} from "@/components/admin/dashboard/data-table";
import { SectionCards } from "@/components/admin/dashboard/section-cards";
import {
  getCollectionCount,
  getDailyOrdersSeries,
  getDesignerCount,
  getFlagshipCount,
  getMaterialCount,
  getProductCount,
  getProjectCount,
} from "@/lib/repositories/admin";
import { getProductAdminRows } from "@/lib/repositories/products";

/**
 * The admin dashboard — a read-only operational snapshot:
 *
 *   1. Stat cards with the live count of each catalog entity.
 *   2. Orders over time — the real per-day count from the `order` table
 *      (empty state until the first order arrives; no sample data).
 *   3. The products overview fed from getProductAdminRows(): name, category,
 *      stock and designer are repository data. Row-level CRUD lives on
 *      /admin/products, so this table only links into it.
 *
 * This page is a server component on purpose: the counts and series are read
 * from the database here once per request and passed down to the client
 * widgets. Access to every route below it is already gated by the (admin)
 * layout (requireAdminAccess) and proxy.ts.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [
    products,
    designers,
    collections,
    materials,
    flagships,
    projects,
    ordersSeries,
    productRows,
  ] = await Promise.all([
    getProductCount(),
    getDesignerCount(),
    getCollectionCount(),
    getMaterialCount(),
    getFlagshipCount(),
    getProjectCount(),
    getDailyOrdersSeries(),
    getProductAdminRows(),
  ]);

  const rows: DashboardProductRow[] = productRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.categoryName,
    designer: row.designerName ?? null,
    stock: row.existsInStore ? "in" : "out",
  }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <AdminPageHeader
            locale={locale}
            titleKey="admin.overview.title"
            descriptionKey="admin.overview.subtitle"
          />
          <SectionCards
            counts={{
              products,
              designers,
              collections,
              materials,
              flagships,
              projects,
            }}
          />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive data={ordersSeries} />
          </div>
          <DataTable data={rows} />
        </div>
      </div>
    </div>
  );
}

