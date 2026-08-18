/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import HomepageSection from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Vocla2026Section() {
  const { t } = useLanguage();
  const { vocla } = homepageSections;

  return (
    <HomepageSection className="relative  w-full bg-background py-40 md:py-80">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* H-Life wordmark */}
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 block font-serif text-3xl  text-white md:mb-16 md:text-5xl"
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
              <SectionTitle className="text-white">
                {t("vocla.title")}
              </SectionTitle>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
              <Paragraph textColor="text-background-secondary">
                {t("vocla.p1")}
              </Paragraph>
              <Paragraph textColor="text-background-secondary">
                {t("vocla.p2")}
              </Paragraph>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
              className="mt-12"
            >
              <PlusTextBtn className="text-sm tracking-tight" text="Read more" href="#"/>
            </motion.div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
