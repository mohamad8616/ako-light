import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { ProjectForm } from "@/components/admin/catalog/projects/ProjectForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getProductOptions } from "@/lib/repositories/products";
import { getProjectAdminDetail } from "@/lib/repositories/projects";
import { notFound } from "next/navigation";

/**
 * Edit-project page. Unknown ids 404 (the row may have been deleted under the
 * editor); the literal "new" also 404s so a routing change can never render
 * this form against a non-row.
 */
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (id === "new") notFound();

  const t = translations[locale];
  const [detail, products] = await Promise.all([
    getProjectAdminDetail(id),
    getProductOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.project.edit"
          descriptionKey="admin.section.projects.description"
          actions={
            <BackLink
              href="/admin/projects"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.projects"]}`}
            />
          }
        />
        <ProjectForm detail={detail} id={id} products={products} />
      </div>
    </div>
  );
}
