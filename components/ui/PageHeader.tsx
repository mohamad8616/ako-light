"use client";

import { motion } from "framer-motion";
import HengeLogo from "@/components/ui/HengeLogo";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { t, lang, toggleLang } = useLanguage();

  return (
    <header className="relative w-full bg-background">
      <div className="mx-auto flex h-24 max-w-[1600px] items-center justify-between px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <Link href="/" className="cursor-pointer">
          <HengeLogo className="w-24 h-auto fill-white transition-opacity hover:opacity-70" />
        </Link>

        <div className="flex items-center gap-6">
          <button
            onClick={toggleLang}
            className="text-[13px] font-light uppercase tracking-[0.15em] text-white/80 transition hover:text-white cursor-pointer"
          >
            {lang === "en" ? "فارسی" : "EN"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pb-20 pt-16 md:px-12 md:pb-28 md:pt-24 lg:px-20 xl:px-[8.5vw]">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl font-light uppercase tracking-tight text-white md:text-8xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/60 md:text-lg"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </header>
  );
}