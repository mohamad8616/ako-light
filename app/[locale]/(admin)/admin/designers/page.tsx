import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DesignersTable } from "@/components/admin/catalog/designers/DesignersTable";
import { getDesignerAdminRows } from "@/lib/repositories/designers";

/**
 * The designers list — the dashboard's DataTable wired into real use.
 *
 * Server component on purpose: the rows are read here once per request and
 * passed down to the client table (the DTOs are plain and serializable —
 * Decimal/Date never cross the boundary).
 */
export default async function DesignersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getDesignerAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.designers"
          descriptionKey="admin.section.designers.description"
        />
        <DesignersTable rows={rows} />
      </div>
    </div>
  );
}