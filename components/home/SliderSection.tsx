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
      <div className="relative h-[80vh] min-h-[600px] w-full">
        {/* Background Image with slow Ken Burns */}
        <motion.div
          initial={{ scale: 1.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={slider.image}
            alt={slider.tag}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-background" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.3em" }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm font-light uppercase text-white/60"
          >
            {t("slider.title")}
          </motion.span>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-5xl font-light tracking-tight md:text-7xl lg:text-8xl"
          >
            {t("slider.subtitle")}
          </motion.h2>

          {/* Divider line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 h-px w-24 bg-white/40"
          />

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10"
          >
            <Link
              href="/products"
              className="group inline-flex items-center gap-4 text-sm font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:text-white/70"
            >
              <span className="relative">
                {t("slider.cta")}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-500 group-hover:scale-x-100" />
              </span>
              <span className="inline-block text-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90">
                +
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}