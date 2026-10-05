import { ProductEditModalShell } from "@/components/admin/catalog/products/ProductEditModalShell";
import { ProductForm } from "@/components/admin/catalog/products/ProductForm";
import { getAdminDictionary } from "@/lib/i18n/admin-translations";
import { isLocale } from "@/lib/i18n/routing";
import { getDesignerOptions } from "@/lib/repositories/designers";
import { getProductCategoryOptions } from "@/lib/repositories/product-categories";
import { getProductAdminDetail } from "@/lib/repositories/products";
import { notFound } from "next/navigation";

/**
 * The intercepted product edit route — the URL-backed edit modal.
 *
 * On a SOFT navigation from the Products list, Next.js intercepts
 * `/admin/products/<id>` into this page and it renders inside the @modal slot,
 * so the Products page stays visible underneath. On a HARD navigation (direct
 * URL, refresh) the interception does not happen: the request resolves to the
 * real `[id]` page below, which renders the same form on its own — the
 * "shareable URL renders the edit screen" behavior the parallel-route modal
 * pattern is built for.
 *
 * The page loads the SAME detail DTO the `[id]` page loads and renders the
 * SAME `ProductForm`, so the modal and the page never drift. Authorization is
 * unchanged: this page sits under the same (admin) layout whose
 * `requireAdminAccess()` runs before anything here renders.
 */
export default async function InterceptedEditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (id === "new") notFound();

  const t = getAdminDictionary(locale);
  const [detail, categories, designers] = await Promise.all([
    getProductAdminDetail(id),
    getProductCategoryOptions(),
    getDesignerOptions(),
  ]);
  if (!detail) notFound();

  return (
    <ProductEditModalShell title={t["admin.product.edit"]}>
      <ProductForm
        detail={detail}
        categories={categories}
        designers={designers}
      />
    </ProductEditModalShell>
  );
}
