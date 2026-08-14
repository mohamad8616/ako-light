/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HIstraBanner() {
  const { t } = useLanguage();
  const { istra } = homepageSections;

  return (
    <section className="relative w-full bg-background-secondary pb-0 pt-20 md:pt-28">
      <motion.div
        initial={{ opacity: 0, y: "30%" }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{}}
        transition={{ duration: 1, ease: EASE }}
        className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]"
      >
        {/* Title */}
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{}}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-5xl font-bold uppercase leading-[0.95] tracking-tight text-background md:text-7xl"
          >
            {t("istra.title")}
          </motion.h2>
        </div>

        {/* Image — kept inside the same page container as the title (not
            full viewport width), but bled below this section's own box via
            a negative bottom margin so it spills onto whatever follows. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
          className="group relative z-10 mt-10 -mb-16 aspect-16/10 w-full overflow-hidden sm:aspect-video md:mt-14 md:-mb-24 lg:-mb-32"
        >
          <img
            src={istra.image}
            alt={t("istra.title")}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />

          {/* Discover CTA, anchored to the image's bottom-right */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6"
          >
            <Link
              href="/projects/h-istra"
              className="group/cta inline-flex items-center gap-2 bg-background-secondary/90 px-4 py-2 text-sm font-medium uppercase tracking-[0.2em] text-background backdrop-blur-sm transition-colors duration-300 hover:text-background/60"
            >
              <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover/cta:rotate-90">
                +
              </span>
              <span className="relative">
                {t("istra.discover")}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-background transition-[width] duration-300 group-hover/cta:w-full" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
