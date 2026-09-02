"use client";

import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import UnderLineEffect from "../ui/UnderLineEffect";

interface ProductCategoryCardProps {
  name: string;
  slug: string;
  images: string[];
  index: number;
  parentSlug?: string;
}

export default function ProductCategoryCard({
  name,
  slug,
  images,
  index,
  parentSlug,
}: ProductCategoryCardProps) {
  const href = parentSlug
    ? `/products/${parentSlug}/${slug}`
    : `/products/${slug}`;
  console.log(images);
  return (
    <motion.div
    
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link href={href} className="group block">
        <div className="relative aspect-4/3 h-full w-full overflow-hidden bg-[#111]">
          <Image
            src={images[0]}
            alt={`${name} default`}
            fill
            className={`absolute object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              images[1]
                ? "group-hover:opacity-0"
                : "transition duration-300 group-hover:scale-105"
            }`}
          />
          {images[1] && (
            <Image
              src={images[1]}
              alt={`${name} hover`}
              fill
              className="object-cover opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
            />
          )}
        </div>

        <div className="relative mt-4 inline-block md:mt-5">
          <span className="text-background-secondary text-sm tracking-tight uppercase">
            {name}
          </span>
          <UnderLineEffect />
        </div>
      </Link>
    </motion.div>
  );
}
