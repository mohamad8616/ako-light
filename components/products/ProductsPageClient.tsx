"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import type { ProductCategory } from "@/lib/data/product-categories/types";

export default function ProductsPageClient({
  categories,
}: {
  categories: ProductCategory[];
}) {
  return (
    <main className="bg-background w-full">
      <ProductsHeader titleKey="products.title" />
      <ProductsGrid categories={categories} />
    </main>
  );
}
