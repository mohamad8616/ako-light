"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";

export default function S34Harmony() {
  const { t } = useLanguage();

  const kicker = t("s34.harmony.kicker");
  const p1 = t("s34.harmony.p1");
  const p2 = t("s34.harmony.p2");

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/3">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-background text-2xl leading-[0.95] font-medium tracking-wide uppercase md:text-4xl"
          >
            {kicker}
          </motion.h2>
        </div>

        {/* Three-column paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          <Paragraph>{p1}</Paragraph>
          <Paragraph>{p2}</Paragraph>
        </div>
      </div>
    </HomepageSection>
  );
}
