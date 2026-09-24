"use client";

import ProductInfoSection from "@/components/products/prod/ProdInfoSection";
import RelatedProductsSection from "@/components/products/prod/RelatedProdSection";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import type { Product } from "@/lib/data/product-categories/types";
import CatalogueDownloadSection from "./CatalogueDownloadSection";

interface ProductPageClientProps {
  productt: Product;
  link: string;
  sameCategoryProducts: Product[];
  /** Gallery image URLs (DB-sourced ProductImage rows, sortOrder order). */
  galleryImages: string[];
}

export default function ProductPageClient({
  productt,
  link,
  sameCategoryProducts,
  galleryImages,
}: ProductPageClientProps) {
  // Pass the bilingual name straight through: PictureHero resolves it against
  // the active language (reactively), so it follows the page locale instead of
  // always falling back to the first key in the object (which was `en`).
  return (
    <main className="bg-background-secondary relative">
      <PictureHero image={productt.heroImage} nameLocalized={productt.name} />
      <ProductInfoSection product={productt} />
      <ImageGalleryCarousel
        multiWidth={true}
        mobileColumn={true}
        circle={true}
        images={galleryImages}
      />
      <RelatedProductsSection
        product={productt}
        sameCategoryProducts={sameCategoryProducts}
      />
      <CatalogueDownloadSection link={link} />
    </main>
  );
}
