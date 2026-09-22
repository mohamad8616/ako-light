import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import {
  getCollectionCount,
  getDesignerCount,
  getFlagshipCount,
  getMaterialCount,
  getProductCount,
  getProjectCount,
} from "@/lib/repositories/admin";

import data from "@/lib/data/dashboard/data.json";

/**
 * The admin dashboard — a read-only operational snapshot:
 *
 *   1. Stat cards with the live count of each catalog entity.
 *   2. The visitors chart (placeholder data until analytics is wired up).
 *   3. The products table (sample rows for now — the products CRUD screen
 *      lives in its own section page later).
 *
 * This page is a server component on purpose: the counts are read from the
 * database here once per request and passed down to the client cards. Access
 * to every route below it is already gated by the (admin) layout
 * (requireAdminAccess) and proxy.ts.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [products, designers, collections, materials, flagships, projects] =
    await Promise.all([
      getProductCount(),
      getDesignerCount(),
      getCollectionCount(),
      getMaterialCount(),
      getFlagshipCount(),
      getProjectCount(),
    ]);

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
            <ChartAreaInteractive />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
