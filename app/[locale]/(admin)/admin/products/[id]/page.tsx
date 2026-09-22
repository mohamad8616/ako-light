import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { ProductForm } from "@/components/admin/catalog/products/ProductForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getDesignerOptions } from "@/lib/repositories/designers";
import { getProductCategoryOptions } from "@/lib/repositories/product-categories";
import { getProductAdminDetail } from "@/lib/repositories/products";
import { notFound } from "next/navigation";

/**
 * Edit-product page. Unknown ids 404 (the row may have been deleted under the
 * editor); the literal "new" also 404s so a future routing change can never
 * render this form against a non-row.
 */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (id === "new") notFound();

  const t = translations[locale];
  const [detail, categories, designers] = await Promise.all([
    getProductAdminDetail(id),
    getProductCategoryOptions(),
    getDesignerOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.product.edit"
          descriptionKey="admin.section.products.description"
          actions={
            <BackLink
              href="/admin/products"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.products"]}`}
            />
          }
        />
        <ProductForm
          detail={detail}
          categories={categories}
          designers={designers}
        />
      </div>
    </div>
  );
}
