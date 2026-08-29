"use client";

import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Link from "next/link";
import UnderLineEffect from "../ui/UnderLineEffect";

interface ProductCategoryCardProps {
  name: string;
  slug: string;
  image: string;
  hoverImage?: string;
  index: number;
  parentSlug?: string;
}

export default function ProductCategoryCard({
  name,
  slug,
  image,
  hoverImage,
  index,
  parentSlug,
}: ProductCategoryCardProps) {
  const href = parentSlug ? `/products/${parentSlug}/${slug}` : `/products/${slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link
        href={href}
        className="group block"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-[#111]">
          <img
            src={image}
            alt={`${name} default`}
            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              hoverImage ? "group-hover:opacity-0" : "group-hover:scale-105 transition duration-300"
            }`}
          />
          {hoverImage && (
            <img
              src={hoverImage}
              alt={`${name} hover`}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
            />
          )}
        </div>


        <div className="relative mt-4 inline-block md:mt-5">
          <span className="text-background-secondary text-sm tracking-tight uppercase">
            {name}
          </span>
          <UnderLineEffect  />
        </div>
      </Link>
    </motion.div>
  );
}
