import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FlagshipsTable } from "@/components/admin/catalog/flagships/FlagshipsTable";
import { getFlagshipAdminRows } from "@/lib/repositories/flagships";

/**
 * The flagships list — the section's rows through the shared DataTable, with
 * its own columns (name, city, image, detail-page state, slug, display order).
 *
 * Server component on purpose: the rows are read once per request and passed
 * down to the client table as plain, serializable DTOs.
 */
export default async function FlagshipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getFlagshipAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.flagships"
          descriptionKey="admin.section.flagships.description"
        />
        <FlagshipsTable rows={rows} />
      </div>
    </div>
  );
}
