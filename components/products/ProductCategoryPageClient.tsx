"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import type { ProductCategory } from "@/lib/data/product-categories/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ProductCategoryPageClientProps {
  productSlug: string;
  category: ProductCategory;
}

export default function ProductCategoryPageClient({
  productSlug,
  category,
}: ProductCategoryPageClientProps) {
  const { t } = useLanguage();

  const categoryName = t(category.i18nKey);

  return (
    <main className="bg-background w-full">
      <ProductsHeader title={categoryName} />
      <ProductsGrid products={category.products} parentSlug={productSlug} />
    </main>
  );
}
