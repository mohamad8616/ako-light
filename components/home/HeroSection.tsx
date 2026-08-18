"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import { EASE } from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import ScrollIndicator from "../ui/ScrollIndicator";

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <Video />

      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

      {/* Hero copy — bottom-left aligned, tight leading between the two lines */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[1600px] px-6 pb-16 md:px-12 md:pb-20 lg:px-20 lg:pb-24 xl:px-[8.5vw]">
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
              className="text-5xl uppercase leading-[0.92] tracking-wider text-background-secondary xs:text-6xl md:text-7xl lg:text-8xl"
            >
              {t("hero.collection")}
            </motion.h1>
          </div>
          <div className="mt-5 overflow-hidden">
            <motion.h2
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
              className="text-4xl uppercase leading-[0.92] tracking-tight text-background-secondary xs:text-5xl md:text-6xl lg:text-7xl"
            >
              {t("hero.ritualGravity")}
            </motion.h2>
          </div>

          <PlusTextBtn
            text={t("hero.readMore")}
            href="/catalogue"
            className="mt-5"
          />

          {/* Scroll indicator */}
          <ScrollIndicator />
        </div>
      </div>
    </section>
  );
}

function Video() {
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
}
