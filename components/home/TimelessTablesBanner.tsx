"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";
import Reveal from "@/components/ui/Reveal";

export default function TimelessTablesBanner() {
  const { t } = useLanguage();
  const { tables } = homepageSections;

  return (
    <section className="w-full bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3] w-full overflow-hidden"
          >
            <img
              src={homepageSections.slider.image}
              alt={t("tables.title")}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </motion.div>

          {/* Right: Content */}
          <div>
            <Reveal>
              <h2 className="text-4xl font-light uppercase tracking-tight text-white md:text-6xl">
                {t("tables.title")}
              </h2>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mt-8 max-w-md text-base font-light leading-relaxed text-white/60 md:text-lg">
                {t("tables.description")}
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <Link
                href="/products"
                className="group mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-white/70"
              >
                <span>{t("tables.discover")}</span>
                <span className="inline-block text-xl transition-transform duration-300 group-hover:rotate-90">
                  +
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}