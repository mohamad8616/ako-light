"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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

}: RowProps) {
  const { t } = useLanguage();
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
      className="border-background-secondary pb-6 border-b-2 w-full"
    >
      <Link
        href={`/${route}/${slug ? slug : ""}`}
        className="mx-auto flex w-full flex-col md:items-end gap-4  py-8 sm:gap-12 md:flex-row md:py-10"
      >
        {/* Portrait */}
        <div
          className={`relative aspect-square h-[40vh] w-full shrink-0 overflow-hidden sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-60 lg:w-${pathname === "materials" || pathname === "projects" ? "90" : "60"}`}
        >
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover grayscale transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-102"
          />
        </div>

        {/* Name */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex-1 text-lg leading-normal font-medium  tracking-tighter text-white uppercase transition-all duration-700 sm:text-xl md:text-3xl lg:text-4xl"
        >
          {name}
        </motion.h2>

        {/* Discover CTA */}
        <span className="hidden shrink-0 md:block">
          <PlusTextBtn text={t("ui.discover")} />
        </span>
      </Link>
    </motion.div>
  );
}
