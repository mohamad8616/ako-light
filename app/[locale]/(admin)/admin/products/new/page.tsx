import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { ProductForm } from "@/components/admin/catalog/products/ProductForm";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getDesignerOptions } from "@/lib/repositories/designers";
import { getProductCategoryOptions } from "@/lib/repositories/product-categories";
import { notFound } from "next/navigation";

/**
 * Create-product page. The form's slug auto-derives from the English name while
 * untouched; categories/designers come from the picker option lists.
 */
export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = translations[locale];
  const [categories, designers] = await Promise.all([
    getProductCategoryOptions(),
    getDesignerOptions(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.product.new"
          descriptionKey="admin.section.products.description"
          actions={
            <BackLink
              href="/admin/products"
              label={`${t["admin.crud.back"]} — ${t["admin.nav.products"]}`}
            />
          }
        />
        <ProductForm categories={categories} designers={designers} />
      </div>
    </div>
  );
}
