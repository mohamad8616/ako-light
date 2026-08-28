"use client";

import { motion } from "framer-motion";
import { EASE } from "@/utility/HomepageSection";
import PlusTextBtn from "@/components/ui/PlusTextBtn";

interface ProductListItemProps {
  name: string;
  image: string;
  index: number;
  category: string;
}

function ProductListItem({ name, image, index, category }: ProductListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.5, delay: (index % 4) * 0.08, ease: EASE }}
      className="border-b border-white/20"
    >
      <div className="flex items-end gap-8 py-8 sm:gap-12 md:py-10">
        <div className="h-30 w-30 shrink-0 overflow-hidden sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-60 lg:w-60">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover grayscale transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-102"
          />
        </div>
        <h2 className="flex-1 truncate text-2xl leading-none tracking-tighter text-white uppercase transition-all duration-700 sm:text-3xl md:text-4xl">
          {name}
        </h2>
        <span className="text-background-secondary text-sm tracking-tight uppercase hidden md:block">
          {category}
        </span>
        <PlusTextBtn text="Discover" />
      </div>
    </motion.div>
  );
}

interface ProductListProps {
  items: Array<{ name: string; slug: string; image: string; category: string }>;
}

export default function ProductList({ items }: ProductListProps) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-background-secondary">
        No products found in this category.
      </div>
    );
  }

  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {items.map((item, i) => (
          <ProductListItem key={item.slug} index={i} {...item} />
        ))}
      </div>
    </section>
  );
}
