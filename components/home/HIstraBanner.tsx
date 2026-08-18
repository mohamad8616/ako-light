/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import HomepageSection, { EASE } from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

export default function HIstraBanner() {
  const { t } = useLanguage();
  const { istra } = homepageSections;

  return (
    <section className="relative w-full bg-background-secondary pb-0 pt-20 md:pt-28 h-screen">
      <HomepageSection className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw] absolute lg:-bottom-82">
        {/* Title */}
        <div className="overflow-hidden">
          <SectionSubTitle>Henge Projects</SectionSubTitle>
          <SectionTitle>{t("istra.title")}</SectionTitle>
        </div>

        {/* Image — kept inside the same page container as the title (not
            full viewport width), but bled below this section's own box via
            a negative bottom margin so it spills onto whatever follows. */}

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
          className="group relative z-10 mt-10 -mb-16 aspect-16/10 w-full overflow-hidden sm:aspect-video md:mt-14 md:-mb-16 lg:-mb-18 "
        >
          <img
            src={istra.image}
            alt={t("istra.title")}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </motion.div>

        {/* Discover CTA, ~30px below the image */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
          className="relative  z-20 mt-24"
        >
          <PlusTextBtn href={"#"} text={"Discover"} className="flex!" />
        </motion.div>
      </HomepageSection>
    </section>
  );
}
