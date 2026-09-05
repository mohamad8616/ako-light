"use client";

import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import { productCategories } from "@/lib/data/productCategories";

export default function ProductsPageClient() {
  return (
    <main className="bg-background w-full">
      <ProductsHeader titleKey="products.title" />
      <ProductsGrid categories={productCategories} />
    </main>
  );
}
