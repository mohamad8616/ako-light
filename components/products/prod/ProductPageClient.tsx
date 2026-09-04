"use client";

import BuyBtn from "@/components/cart/BuyNowBtn";
import ProductInfoSection from "@/components/products/prod/ProdInfoSection";
import RelatedProductsSection from "@/components/products/prod/RelatedProdSection";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import { getProduct } from "@/lib/data/productCategories";
import { productKey } from "@/lib/i18n/localized";
import { notFound } from "next/navigation";

interface ProductPageClientProps {
  productSlug: string;
  prodSlug: string;
}

export default function ProductPageClient({
  productSlug,
  prodSlug,
}: ProductPageClientProps) {
  const productt = getProduct(productSlug, prodSlug);
  if (!productt) notFound();

  return (
    <main className="bg-background-secondary relative">
      <PictureHero
        image={productt.heroImage}
        nameKey={productKey(productt.slug)}
      />
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
