/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HomepageSection from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

const carouselKeys: Record<string, string> = {
  "Breccia Medicea": "carousel.breccia",
  "MDW 2022": "carousel.mdw2022",
  "OFF-ROAD": "carousel.offRoad",
  "HENGE BEIJING": "carousel.beijing",
  "TEST-ONE": "carousel.testOne",
  "WHY HENGE": "carousel.whyHenge",
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomeCarousel() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);

  const carouselItems = homepageSections.carousel;

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      setMaxDrag(Math.max(0, el.scrollWidth - el.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <HomepageSection className="w-full overflow-hidden border-y border-white/10 bg-background-secondary py-20 md:py-28 lg:py-32">
      {/* Heading row */}
      <div className="mx-auto mb-10 flex max-w-[1900px] items-end justify-between px-6 md:mb-14 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hidden text-xs font-light uppercase tracking-[0.2em] text-white/35 md:block"
        >
          Drag to explore →
        </motion.span>
      </div>

      {/* Horizontal Scroll Carousel */}
      <motion.div
        ref={containerRef}
        className="no-scrollbar flex cursor-grab gap-5 overflow-x-auto px-6 pb-2 active:cursor-grabbing sm:gap-6 md:px-12 lg:gap-8 lg:px-20 xl:px-[8.5vw]"
        drag="x"
        dragConstraints={{ left: -maxDrag, right: 0 }}
        dragElastic={0.06}
        dragTransition={{ power: 0.25, timeConstant: 200 }}
      >
        {carouselItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
            className="group relative w-[68vw] shrink-0 xs:w-[56vw] sm:w-[40vw] md:w-[31vw] lg:w-[24vw] xl:w-[20vw]"
          >
            <Link href="/hlife" className="block">
              <div className="relative aspect-4/5 w-full overflow-hidden bg-[#111] ">
                <img
                  src={item.image}
                  alt={item.title}
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
              </div>

              <PlusTextBtn text={item.title} textColor="text-background mt-5 bg-amber-300 ml-0"/>
            </Link>
          </motion.div>
        ))}

        {/* trailing spacer so the last card can be dragged fully into view */}
        <div className="w-2 shrink-0 sm:w-4" aria-hidden="true" />
      </motion.div>
    </HomepageSection>
  );
}
