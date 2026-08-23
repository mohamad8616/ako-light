"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="bg-background flex min-h-[60vh] w-full flex-col items-center justify-center px-6 md:px-12 lg:px-20">
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-background-secondary text-5xl font-light tracking-tight uppercase md:text-8xl"
      >
        {t("notFound.title")}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-background-secondary/60 mt-6 max-w-xl text-center text-base leading-relaxed font-light md:text-lg"
      >
        {t("notFound.subtitle")}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12"
      >
        <Link
          href="/"
          className="group text-background-secondary relative inline-block w-fit text-sm font-light tracking-[0.08em] uppercase"
        >
          {t("notFound.backHome")}
          <span className="bg-background-secondary absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
          <span className="bg-background-secondary absolute right-0 -bottom-1 h-px w-full origin-right scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
        </Link>
      </motion.div>
    </main>
  );
}
