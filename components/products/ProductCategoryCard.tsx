"use client";

import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import UnderLineEffect from "../ui/UnderLineEffect";

interface ProductCategoryCardProps {
  name: string;
  slug: string;
  image: string;
  index: number;
}

export default function ProductCategoryCard({
  name,
  slug,
  image,
  index,
}: ProductCategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link
        href={`/products/${slug}`}
        className="group block"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-[#111]">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
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
