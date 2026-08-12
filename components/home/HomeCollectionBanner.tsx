"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";

export default function HomeCollectionBanner() {
  const { t } = useLanguage();
  const { homeCollection } = homepageSections;

  return (
    <section className="w-full bg-background py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3] w-full overflow-hidden lg:order-2"
          >
            <img
              src={homeCollection.image}
              alt={t("homeCollection.title")}
              className="h-full w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
            />
          </motion.div>

          {/* Content */}
          <div className="lg:order-1">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm font-light uppercase tracking-[0.3em] text-white/50"
            >
              Henge
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-5xl font-light uppercase tracking-tight text-white md:text-6xl"
            >
              {t("homeCollection.title")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-md text-base font-light leading-relaxed text-white/60 md:text-lg"
            >
              {t("homeCollection.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12"
            >
              <Link
                href="https://homecollection.henge07.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-4 text-sm font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:text-white/70"
              >
                <span className="relative">
                  {t("homeCollection.discover")}
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
    </section>
  );
}