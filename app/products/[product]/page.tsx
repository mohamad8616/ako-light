import ProductCategoryPageClient from "@/components/products/ProductCategoryPageClient";
import { productCategories } from "@/lib/data/productCategories";

interface PageProps {
  params: Promise<{ product: string }>;
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { product } = await params;
  return <ProductCategoryPageClient productSlug={product} />;
}

export async function generateStaticParams() {
  return productCategories.map((c) => ({ product: c.slug }));
}
