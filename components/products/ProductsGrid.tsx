"use client";

import ProductCategoryCard from "./ProductCategoryCard";

const categories = [
  { name: "Lighting", slug: "lighting" },
  { name: "Bookcases", slug: "bookcases" },
  { name: "Cabinets And Sideboards", slug: "cabinets-and-sideboards" },
  { name: "Tables", slug: "tables" },
  { name: "Coffee Tables", slug: "coffee-tables" },
  { name: "Sofas And Armchairs", slug: "sofas-and-armchairs" },
  { name: "Chairs And Stools", slug: "chairs-and-stools" },
  { name: "Kitchens", slug: "kitchens" },
  { name: "Bedroom", slug: "bedroom" },
  { name: "Wall Panelling", slug: "wall-panelling" },
  { name: "Accessories", slug: "accessories" },
].map((c) => ({ ...c, image: `https://picsum.photos/seed/${c.slug}/700/525` }));

export default function ProductsGrid() {
  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-x-3 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {categories.map((category, i) => (
            <ProductCategoryCard key={category.slug} index={i} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
}
