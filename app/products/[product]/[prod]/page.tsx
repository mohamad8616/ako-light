import BuyBtn from "@/components/cart/BuyNowBtn";
import ProductInfoSection from "@/components/products/prod/ProdInfoSection";
import RelatedProductsSection from "@/components/products/prod/RelatedProdSection";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import { getProduct, products } from "@/lib/data/productCategories";
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
    <main className="bg-background-secondary relative">
      <PictureHero image={productt.heroImage} name={productt.name} />
      <ProductInfoSection product={productt} />
      <ImageGalleryCarousel
        multiWidth={true}
        mobileColumn={true}
        images={productt.images}
      />
      <RelatedProductsSection product={productt} />
      <BuyBtn product={productt} />
    </main>
  );
}
