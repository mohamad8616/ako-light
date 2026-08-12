/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";

export default function TimelessTablesBanner() {
  const { t } = useLanguage();
  // const { tables } = homepageSections;

  return (
    <section className="relative w-full overflow-hidden bg-background">
      {/* Full-width image with overlay */}
      <div className="relative h-[90vh] min-h-150 w-full">
        <motion.div
          initial={{ scale: 1.15, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={homepageSections.slider.image}
            alt={t("tables.title")}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/40 to-transparent" />
        </motion.div>

        {/* Content overlay */}
        <div className="relative z-10 flex h-full items-center">
          <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
            <div className="max-w-xl">
              {/* Kicker */}
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-sm font-light uppercase tracking-[0.3em] text-white/50"
              >
                Henge
              </motion.span>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 text-5xl font-light uppercase tracking-tight text-white md:text-7xl"
              >
                {t("tables.title")}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 text-base font-light leading-relaxed text-white/70 md:text-lg"
              >
                {t("tables.description")}
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-12"
              >
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-4 text-sm font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:text-white/70"
                >
                  <span className="relative">
                    {t("tables.discover")}
                    <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-500 group-hover:scale-x-100" />
                  </span>
                  <span className="inline-block text-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90">
                    +
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}