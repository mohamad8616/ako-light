/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HengeParisBanner() {
  const { t } = useLanguage();
  const { paris } = homepageSections;

  return (
    <section className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left: image, with peeking "next" card below it */}
          <div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className="group relative aspect-4/5 w-full overflow-hidden lg:aspect-3/4"
            >
              <img
                src={paris.image}
                alt={t("paris.title")}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />

              {/* Small circular badge, top-left */}
              <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background text-white">
                <span className="text-[10px] font-light">H</span>
              </div>
            </motion.div>


          </div>

          {/* Right: kicker, title, two-column body, CTA */}
          <div className="lg:col-span-7">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="block text-xs font-medium uppercase tracking-[0.25em] text-background/50"
            >
              {t("paris.kicker")}
            </motion.span>

            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="mt-2 text-5xl font-bold uppercase leading-[0.95] tracking-tight text-background md:text-7xl"
              >
                {t("paris.title")}
              </motion.h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
                className="text-[15px] font-light leading-relaxed text-background/75 md:text-base"
              >
                {t("paris.p1")}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                className="text-[15px] font-light leading-relaxed text-background/75 md:text-base"
              >
                {t("paris.p2")}
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
                href="/hlife/henge-paris"
                className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:text-background/60"
              >
                <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
                  +
                </span>
                <span className="relative">
                  {t("paris.discover")}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-background transition-[width] duration-300 group-hover:w-full" />
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
