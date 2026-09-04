"use client";

import { Product, ProductCategory } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productName } from "@/lib/i18n/localized";
import HomepageSection from "@/utility/HomepageSection";
import ProductCategoryCard from "./ProductCategoryCard";

interface ProductsGridProps {
  categories?: ProductCategory[];
  products?: Product[];
  parentSlug?: string;
}

export default function ProductsGrid({
  categories,
  products,
  parentSlug,
}: ProductsGridProps) {
  const { t } = useLanguage();
  const items = products
    ? products.map((product) => ({
        key: product.slug,
        name: productName(t, product.slug),
        slug: product.slug,
        images: [product.images[0], product.hoverImage].filter(Boolean),
      }))
    : (categories ?? []).map((category) => ({
        key: category.slug,
        name: t(category.i18nKey),
        slug: category.slug,
        images: category.products[0]?.images ?? [],
      }));

  if (items.length === 0) {
    return (
      <HomepageSection className="bg-background flex w-full items-center justify-center pb-20 md:pb-28">
        <p>{t("products.noProducts")}</p>
      </HomepageSection>
    );
  }
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
      <div className="grid grid-cols-1 gap-x-3 gap-y-12 md:grid-cols-3 md:gap-y-16">
        {items.map((item, i) => (
          <ProductCategoryCard
            key={item.key}
            index={i}
            animateOnLoad={i < 3}
            parentSlug={parentSlug}
            name={item.name}
            slug={item.slug}
            images={item.images}
          />
        ))}
      </div>
    </HomepageSection>
  );
}
