/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

interface RowProps {
  name: string;
  slug?: string;
  image: string;
  index: number;
  route?: string;
  animateOnLoad?: boolean;
  height?: string;
  width?: string;
}

export default function Row({
  route,
  name,
  slug,
  image,
  index,
  animateOnLoad = false,
  height = "30",
  width = "30",
}: RowProps) {
  const pathname = usePathname().slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      {...(animateOnLoad
        ? { animate: { opacity: 1, y: 0 } }
        : {
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "-80px" },
          })}
      transition={{ duration: 1.5, delay: (index % 4) * 0.08, ease: EASE }}
      className="border-b border-white/20"
    >
      <Link
        href={`/${route ? route : ""}/${slug ? slug : ""}`}
        className="flex items-end gap-8 py-8 sm:gap-12 md:py-10"
      >
        {/* Portrait */}
        <div
          className={`h-${height} w-${width} shrink-0 overflow-hidden sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-60 lg:w-${pathname === "materials" || pathname === "projects" ? "90" : "60"}`}
        >
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover grayscale transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-102"
          />
        </div>

        {/* Name */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex-1 truncate text-2xl leading-none tracking-tighter text-white uppercase transition-all duration-700 sm:text-3xl md:text-4xl"
        >
          {name}
        </motion.h2>

        {/* Discover CTA */}
        <PlusTextBtn text="Discover" />
      </Link>
    </motion.div>
  );
}
