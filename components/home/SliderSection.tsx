"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";

export default function SliderSection() {
  const { t } = useLanguage();
  const { slider } = homepageSections;

  return (
    <section className="relative w-full overflow-hidden bg-background">
      <div className="relative h-[70vh] min-h-[500px] w-full">
        {/* Background Image */}
        <motion.div
          initial={{ scale: 1.15, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={slider.image}
            alt={slider.tag}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl font-light tracking-tight md:text-8xl"
          >
            {t("slider.title")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-lg font-light uppercase tracking-[0.3em] text-white/80 md:text-xl"
          >
            {t("slider.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10"
          >
            <Link
              href="/products"
              className="group flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-white/70"
            >
              <span>{t("slider.cta")}</span>
              <span className="inline-block text-xl transition-transform duration-300 group-hover:rotate-90">
                +
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}