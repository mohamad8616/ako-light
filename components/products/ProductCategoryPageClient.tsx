"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import { productCategories } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { notFound } from "next/navigation";

interface ProductCategoryPageClientProps {
  productSlug: string;
}

export default function ProductCategoryPageClient({
  productSlug,
}: ProductCategoryPageClientProps) {
  const { t } = useLanguage();

  const category = productCategories.find((c) => c.slug === productSlug);
  if (!category) notFound();

  const categoryName = t(category.i18nKey);

  return (
    <main className="bg-background w-full">
      <ProductsHeader title={categoryName} />
      <ProductsGrid products={category.products} parentSlug={productSlug} />
    </main>
  );
}
