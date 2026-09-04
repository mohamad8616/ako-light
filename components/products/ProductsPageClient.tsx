"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import { productCategories } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ProductsPageClient() {
  const { t } = useLanguage();

  return (
    <main className="bg-background w-full">
      <ProductsHeader titleKey="products.title" />
      <ProductsGrid categories={productCategories} />
    </main>
  );
}
