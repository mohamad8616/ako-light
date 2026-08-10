"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function VideoSection() {
  const { t } = useLanguage();

  return (
    <section className="relative flex h-[80vh] w-full items-center justify-center overflow-hidden bg-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-6 text-center"
      >
        <h2 className="text-4xl font-light uppercase tracking-[0.2em] text-white md:text-6xl">
          {t("video.title")}
        </h2>
      </motion.div>
    </section>
  );
}