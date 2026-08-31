import PictureHero from "@/components/ui/PictureHero";
import ProductInfoSection from "@/components/products/prod/ProdInfoSection";
import RelatedProductsSection from "@/components/products/prod/RelatedProdSection";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import { getProduct, products } from "@/lib/data/prods";
import { notFound } from "next/navigation";

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

  const productt = getProduct(product, prod);
  if (!productt) notFound();

  return (
    <main className="bg-background-secondary">
      <PictureHero image={productt.heroImage} name={productt.name} />
      <ProductInfoSection product={productt} />
      <ImageGalleryCarousel multiWidth={true} mobileColumn={true} />

      <RelatedProductsSection product={productt} />
    </main>
  );
}
