/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import HomepageSection, { EASE } from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

export default function HengeParisBanner() {
  const { t } = useLanguage();
  const { paris } = homepageSections;

  return (
    <HomepageSection className="w-full bg-background-secondary py-20 md:py-28 ">
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
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="overflow-hidden">
              <SectionSubTitle>{t("paris.kicker")}</SectionSubTitle>
              <SectionTitle>{t("paris.title")}</SectionTitle>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
              <Paragraph>{t("paris.p1")}</Paragraph>
              <Paragraph>{t("paris.p2")}</Paragraph>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
              className="mt-12"
            >
              <PlusTextBtn
                href="/hlife/henge-paris"
                text={t("paris.discover")}
                textColor="text-background"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
