"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Vocla2026Section() {
  const { t } = useLanguage();
  const { vocla } = homepageSections;

  return (
    <section className="w-full bg-background py-20 md:py-28">
      <div className="mx-auto max-w-[1900px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* H-Life wordmark */}
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="block font-serif text-3xl italic text-white md:text-4xl"
        >
          H-Life
        </motion.span>

        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 lg:grid-cols-3 lg:gap-14">
          
          {/* Title + first paragraph */}
          <div>
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-6xl"
              >
                {t("vocla.title")}
              </motion.h2>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
              className="mt-8 text-[15px] font-light leading-relaxed text-background-secondary md:text-base"
            >
              {t("vocla.p1")}
            </motion.p>

            {/* CTA under title/p1 column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              className="mt-14 md:mt-20"
            >
              <Link
                href="/hlife/vocla-2026"
                className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:text-white/60"
              >
                <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
                  +
                </span>
                <span className="relative">
                  {t("vocla.readMore")}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-[width] duration-300 group-hover:w-full" />
                </span>
              </Link>
            </motion.div>
          </div>

          {/* Second paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="text-[15px] font-light leading-relaxed text-background-secondary md:text-base"
          >
            {t("vocla.p2")}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
