"use client";

import type { Product, ProductCategory } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { formatProductPrice } from "@/lib/i18n/price";
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
  const { t, lang } = useLanguage();
  const items = products
    ? products.map((product) => ({
        key: product.slug,
        name: pick(product.name, lang),
        slug: product.slug,
        // Card image pair is BASE + HOVER OVERLAY, in this order:
        //   [0] = the product's hero image  → visible at first glance
        //   [1] = the product's hover image → fades in on mouse-over
        // `ProductCategoryCard` fades `images[0]` out and `images[1]` in, so
        // this order is what makes "hero first, hover on hover" work.
        images: [product.heroImage, product.hoverImage].filter(Boolean),
        // One currency only, per the active locale (EUR for en, Toman for fa).
        priceLabel: formatProductPrice(product, lang),
      }))
    : (categories ?? []).map((category) => ({
        key: category.slug,
        name: pick(category.name, lang),
        slug: category.slug,
        images: category.products[0]?.images ?? [],
        // Category cards span many products — no single price to show.
        priceLabel: undefined,
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
            parentSlug={parentSlug}
            name={item.name}
            slug={item.slug}
            images={item.images}
            priceLabel={item.priceLabel}
          />
        ))}
      </div>
    </HomepageSection>
  );
}
