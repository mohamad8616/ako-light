"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import ScrollIndicator from "../ui/ScrollIndicator";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <motion.video
        autoPlay
        muted
        loop
        playsInline
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: EASE }}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </motion.video>

      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

      {/* Hero copy — bottom-left aligned, tight leading between the two lines */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 md:px-12 md:pb-20 lg:px-20 lg:pb-24 xl:px-[8.5vw]">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            className="text-6xl  uppercase leading-[0.92] text-background-secondary md:text-2xl lg:text-7xl xl-text-8xl tracking-wider"
          >
            {t("hero.collection")}
          </motion.h1>
        </div>
        <div className="overflow-hidden mt-5">
          <motion.h2
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
            className="text-6xl uppercase leading-[0.92] tracking-tight text-background-secondary md:text-7xl lg:text-3xl xl:text-3xl"
          >
            {t("hero.ritualGravity")}
          </motion.h2>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
          className="group mt-6 flex items-center gap-2 uppercase text-white md:mt-8"
        >
          <span className="inline-block text-2xl leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
            +
          </span>
          <span className="relative text-sm font-medium tracking-[0.2em]">
            {t("hero.readMore")}
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-[width] duration-300 group-hover:w-full" />
          </span>
        </motion.button>

        {/* Scroll indicator */}
        <ScrollIndicator />
      </div>
    </section>
  );
}
