import ProductsGrid from "@/components/products/ProductsGrid";
import ProductsHeader from "@/components/products/ProductsHeader";
import { productCategories } from "@/lib/data/productCategories";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ product: string }>;
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { product } = await params;
  const category = productCategories.find((c) => c.slug === product);

  if (!category) {
    notFound();
  }

  return (
    <main className="bg-background w-full">
      <ProductsHeader title={category.name} />
      <ProductsGrid products={category.products} parentSlug={product} />
    </main>
  );
}

export async function generateStaticParams() {
  return productCategories.map((c) => ({ product: c.slug }));
}
