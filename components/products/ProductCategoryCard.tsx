"use client";

import Link from "@/lib/i18n/Link";
import { EASE } from "@/utility/HomepageSection";
import { imageZoomClass } from "@/utility/animations";
import { motion } from "framer-motion";
import Image from "next/image";
import UnderLineEffect from "../ui/UnderLineEffect";

// ----- card entrance animation settings (edit here) -----
/** How long one card takes to fade/slide in (seconds). */
const CARD_DURATION = 0.7;
/** Extra delay added per card so they appear one after another (seconds). */
const CARD_STAGGER_DELAY = 0.6;
/** Cap on the stagger so long grids do not take forever (seconds). */
const CARD_MAX_DELAY = 1.2;
/** Vertical distance (px) a card travels while fading in. */
const CARD_Y_OFFSET = 50;

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
  // Sequential on-load entrance: every card animates on mount with a small
  // per-index delay so cards load one after another. Capped so long grids
  // (e.g. 20+ items) do not stagger forever.
  const delay = Math.min(index * CARD_STAGGER_DELAY, CARD_MAX_DELAY);
  return (
    <motion.div
      initial={{ opacity: 0, y: CARD_Y_OFFSET }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: CARD_DURATION, delay, ease: EASE }}
    >
      <Link href={href} className="group block">
        <div className="relative aspect-4/3 h-full w-full overflow-hidden bg-[#111]">
          <Image
            src={images[0]}
            alt={name}
            fill
            className={
              images[1]
                ? "absolute object-cover transition duration-5000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-0"
                : `absolute ${imageZoomClass({ scale: 105 })}`
            }
          />
          {images[1] && (
            <Image
              src={images[1]}
              alt={name}
              fill
              className="object-cover opacity-0 transition-opacity duration-5000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
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
