/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Vocla2026Section() {
  const { t } = useLanguage();
  const { vocla } = homepageSections;

  return (
    <section className="relative z-20 w-full bg-background py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* H-Life wordmark */}
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 block font-serif text-3xl italic text-white md:mb-16 md:text-4xl"
        >
          H-Life
        </motion.span>

        {/* Same proven image-left / text-right structure as HengeParisBanner */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Image column, with peeking "next project" card */}
          <div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className="group relative aspect-4/5 w-full overflow-hidden bg-[#1c1c1e] lg:aspect-3/4"
            >
              <img
                src={vocla.image}
                alt={t("vocla.title")}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            </motion.div>

          </div>

          {/* Text column: title, then p1/p2 side-by-side, then CTA */}
          <div className="lg:col-span-7">
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

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
                className="text-[15px] font-light leading-relaxed text-background-secondary md:text-base"
              >
                {t("vocla.p1")}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                className="text-[15px] font-light leading-relaxed text-background-secondary md:text-base"
              >
                {t("vocla.p2")}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
              className="mt-12"
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
        </div>
      </div>
    </section>
  );
}
