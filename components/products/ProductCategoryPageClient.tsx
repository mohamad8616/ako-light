"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import type { ProductCategory } from "@/lib/data/product-categories/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { displayCategoryName } from "@/lib/i18n/localized";

interface ProductCategoryPageClientProps {
  productSlug: string;
  category: ProductCategory;
}

export default function ProductCategoryPageClient({
  productSlug,
  category,
}: ProductCategoryPageClientProps) {
  const { t, lang } = useLanguage();

  // Dictionary-first, with the row's own `name` as the fallback — see
  // `displayCategoryName`. The fallback matters because `i18nKey` is now
  // derived from the slug by the admin action, so a brand-new category's key
  // may not exist in the dictionary yet.
  const categoryName = displayCategoryName(t, category, lang);

  return (
    <main className="bg-background w-full">
      <ProductsHeader title={categoryName} />
      <ProductsGrid products={category.products} parentSlug={productSlug} />
    </main>
  );
}
