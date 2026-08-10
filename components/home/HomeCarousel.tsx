"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";

const carouselKeys: Record<string, string> = {
  "Breccia Medicea": "carousel.breccia",
  "MDW 2022": "carousel.mdw2022",
  "OFF-ROAD": "carousel.offRoad",
  "HENGE BEIJING": "carousel.beijing",
  "TEST-ONE": "carousel.testOne",
  "WHY HENGE": "carousel.whyHenge",
};

export default function HomeCarousel() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const carouselItems = homepageSections.carousel;

  return (
    <section className="w-full border-t border-white/10 bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-light uppercase tracking-tight text-white md:text-6xl"
        >
          Henge World
        </motion.h2>
      </div>

      {/* Horizontal Scroll Carousel */}
      <motion.div
        ref={containerRef}
        className="no-scrollbar mt-14 flex cursor-grab gap-6 overflow-x-auto px-6 md:px-12 lg:px-20 xl:px-[8.5vw] active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: -800, right: 0 }}
        dragElastic={0.1}
      >
        {carouselItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group relative w-[280px] shrink-0 overflow-hidden md:w-[350px]"
          >
            <Link href="/hlife" className="block">
              <div className="relative aspect-square w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
              </div>
              <p className="mt-4 text-sm font-light uppercase tracking-[0.15em] text-white/70 transition-colors group-hover:text-white">
                {t(carouselKeys[item.title])}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}