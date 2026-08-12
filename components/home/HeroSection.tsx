"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen overflow-hidden w-full">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/50" />

      {/* Hero Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-bold uppercase tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          {t("hero.collection")}
        </motion.h1>

        <motion.h3
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-xl font-semibold text-white/90 md:text-3xl"
        >
          {t("hero.ritualGravity")}
        </motion.h3>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="group mt-10 flex items-center gap-3 uppercase text-white"
        >
          <span className="inline-block text-2xl transition-transform duration-300 ease-in-out group-hover:rotate-90">
            +
          </span>
          <span className="text-sm font-medium tracking-[0.2em]">
            {t("hero.readMore")}
          </span>
        </motion.button>
      </div>
    </section>
  );
}