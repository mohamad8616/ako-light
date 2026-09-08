"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "@/lib/i18n/Link";

// ---------------------------------------------------------------------------
// SearchCard — reusable result card shared by the PRODUCTS and DESIGNERS
// sections of SearchResults.
//
// Both variants share identical layout, animation and typography; only the
// image aspect ratio and image treatment differ:
//   • product  → 4/3 crop, scales up on group hover
//   • designer → square crop, greyscale, subtle scale on direct hover
// ---------------------------------------------------------------------------

const RESULT_CARD_CLASS =
  "bg-card relative flex h-full w-full items-stretch overflow-hidden";

const NAME_CLASS =
  "text-background-secondary text-sm leading-snug font-medium tracking-tight uppercase sm:text-base md:text-lg";

const IMAGE_BASE_CLASS =
  "object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

const VARIANT_CLASSES = {
  product: {
    imageWrapper: "aspect-4/3",
    image: "group-hover:scale-105",
  },
  designer: {
    imageWrapper: "aspect-square",
    image: "grayscale hover:scale-102",
  },
} as const;

interface SearchCardProps {
  href: string;
  name: string;
  image: string;
  index: number;
  variant: keyof typeof VARIANT_CLASSES;
}

export default function SearchCard({
  href,
  name,
  image,
  index,
  variant,
}: SearchCardProps) {
  const { imageWrapper, image: imageClass } = VARIANT_CLASSES[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index, 6) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full"
    >
      <Link href={href} className="group block">
        <div className={RESULT_CARD_CLASS}>
          <div className={cn("relative w-1/2 shrink-0 sm:w-2/5", imageWrapper)}>
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={cn(IMAGE_BASE_CLASS, imageClass)}
            />
          </div>
          <div className="flex flex-1 items-center justify-center bg-[#1C1C1E] px-4 py-6 text-center sm:px-8 sm:py-10">
            <span className={NAME_CLASS}>{name}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
