import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { ProjectForm } from "@/components/admin/catalog/projects/ProjectForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getProductOptions } from "@/lib/repositories/products";
import { notFound } from "next/navigation";

/**
 * Create-project page. The product picker's options are read here (server
 * side) and passed down; the form's ProductsUsedField writes the ordered
 * `productIds` the action syncs into project_product.
 */
export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = translations[locale];
  const products = await getProductOptions();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.project.new"
          descriptionKey="admin.section.projects.description"
          actions={
            <BackLink
              href="/admin/projects"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.projects"]}`}
            />
          }
        />
        <ProjectForm products={products} />
      </div>
    </div>
  );
}
