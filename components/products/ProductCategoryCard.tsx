"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const EASE = "easeInOut";

interface ProductCategoryCardProps {
  name: string;
  slug: string;
  image: string;
  index: number;
}

export default function ProductCategoryCard({ name, slug, image, index }: ProductCategoryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link
        href={`/products/${slug}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group block"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#111]">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </div>

        {/* Label with a directional underline: it grows left-to-right on
            hover-in (left edge fixed at 0%, width animates 0%→100%), and
            on hover-out both `left` and `width` animate together — since
            they move in lockstep at the same rate, their sum (the right
            edge) stays pinned at 100% the whole time, so only the LEFT
            edge sweeps rightward as it shrinks. Net effect: it always
            reads as a left-to-right sweep, whether appearing or
            disappearing, rather than just growing/shrinking symmetrically. */}
        <div className="relative mt-4 inline-block md:mt-5">
          <span className="text-sm font-medium uppercase tracking-[0.15em] text-white md:text-base">
            {name}
          </span>
          <motion.span
            initial={{ left: "0%", width: "0%" }}
            animate={
              hovered ? { left: "0%", width: "100%" } : { left: "100%", width: "0%" }
            }
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute -bottom-1 h-px bg-white"
          />
        </div>
      </Link>
    </motion.div>
  );
}
