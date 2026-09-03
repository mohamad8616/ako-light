"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE } from "@/utility/HomepageSection";

export default function DesignerHeader({ name }: { name: string }) {
  const { t } = useLanguage();
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Breadcrumb + divider */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-center gap-2 border-b border-white/15 pb-4 text-xs font-medium uppercase tracking-[0.2em]"
        >
          <Link
            href="/designers"
            className="text-white underline underline-offset-4 transition-colors duration-300 hover:text-white/70"
          >
            {t("menu.designers")}
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/70">{name}</span>
        </motion.div>

        {/* Big name */}
        <div className="mt-10 overflow-hidden pb-16 md:mt-14 md:pb-24">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="text-4xl uppercase leading-[0.95]  text-white sm:text-4xl md:text-6xl"
          >
            {name}
          </motion.h1>
        </div>
      </div>
    </header>
  );
}
