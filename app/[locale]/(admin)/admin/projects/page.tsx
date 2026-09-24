import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectsTable } from "@/components/admin/catalog/projects/ProjectsTable";
import { getProjectAdminRows } from "@/lib/repositories/projects";

/**
 * The projects list — the section's rows through the shared DataTable, with
 * its own columns (name, location, year, image, product count, slug, display
 * order).
 *
 * Server component on purpose: the rows are read once per request and passed
 * down to the client table as plain, serializable DTOs.
 */
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getProjectAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.projects"
          descriptionKey="admin.section.projects.description"
        />
        <ProjectsTable rows={rows} />
      </div>
    </div>
  );
}
