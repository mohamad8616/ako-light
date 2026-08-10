"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";
import Reveal from "@/components/ui/Reveal";

export default function HIstraBanner() {
  const { t } = useLanguage();
  const { istra } = homepageSections;

  return (
    <section className="w-full border-t border-white/10 bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Kicker */}
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/50">
            {t("istra.kicker")}
          </p>
        </Reveal>

        {/* Title */}
        <Reveal delay={0.1}>
          <h2 className="mt-4 text-4xl font-light uppercase tracking-tight text-white md:text-7xl">
            {t("istra.title")}
          </h2>
        </Reveal>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-14 aspect-[16/9] w-full overflow-hidden"
        >
          <img
            src={istra.image}
            alt={t("istra.title")}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
        </motion.div>

        {/* CTA */}
        <Reveal delay={0.2}>
          <Link
            href="/projects/h-istra"
            className="group mt-12 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-white/70"
          >
            <span>{t("istra.discover")}</span>
            <span className="inline-block text-xl transition-transform duration-300 group-hover:rotate-90">
              +
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}