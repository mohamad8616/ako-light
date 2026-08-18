"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

interface CollectionCardProps {
  name: string;
  year: string;
  slug: string;
  image: string;
  index: number;
}

export default function CollectionCard({ name, year, slug, image, index }: CollectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link href={`/collection/${slug}`} className="group block">
        <div className="relative aspect-[8/5] w-full overflow-hidden bg-[#111]">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </div>

        <div className="mt-4 md:mt-5">
          <h2 className="text-lg font-light uppercase tracking-[0.08em] text-white transition-colors duration-300 group-hover:text-white/70 md:text-xl">
            {name}
          </h2>
          <p className="mt-1 text-sm font-light text-background-secondary">{year}</p>
        </div>
      </Link>
    </motion.div>
  );
}
