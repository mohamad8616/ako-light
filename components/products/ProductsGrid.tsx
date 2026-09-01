"use client";

import ProductCategoryCard from "./ProductCategoryCard";
import { productCategories } from "@/lib/data/productCategories";

interface ProductsGridProps {
  categories?: Array<{ name: string; slug: string; image: string; hoverImage?: string }>;
  parentSlug?: string;
}

const defaultCategories = productCategories.map((c) => ({
  name: c.name,
  slug: c.slug,
  image: "https://picsum.photos/seed/" + c.slug + "/700/525",
}));

export default function ProductsGrid({ categories, parentSlug }: ProductsGridProps) {
  const items = categories ?? defaultCategories;

  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-x-3 gap-y-12 md:gap-y-16 md:grid-cols-3">
          {items.map((category, i) => (
            <ProductCategoryCard key={category.slug} index={i} parentSlug={parentSlug} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
}
