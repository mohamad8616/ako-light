import ProductPageClient from "@/components/products/prod/ProductPageClient";
import { getProduct, products } from "@/lib/data/productCategories";

interface PageProps {
  params: Promise<{ product: string; prod: string }>;
}

export function generateStaticParams() {
  return Object.values(products).map((p) => ({
    product: p.category,
    prod: p.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { product, prod } = await params;
  const productt = getProduct(product, prod);
  if (!productt) return {};

  return {
    title: `${productt.name} | Henge`,
    description: productt.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod } = await params;
  return <ProductPageClient productSlug={product} prodSlug={prod} />;
}
