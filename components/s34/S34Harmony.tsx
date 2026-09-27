"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { S34KickerSectionContent } from "@/lib/repositories/s34-page";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";

// Server-fetched harmony copy (myPlan.md Part C): the page resolves the
// S34PageSection "harmonySection" row and passes it down — the kicker heading
// and both paragraphs come from the database instead of t("s34.harmony.*").
interface S34HarmonyProps {
  content: S34KickerSectionContent;
}

export default function S34Harmony({ content }: S34HarmonyProps) {
  const { lang } = useLanguage();

  const kicker = pick(content.kicker, lang);
  const paragraphs = content.paragraphs.map((paragraph) =>
    pick(paragraph, lang),
  );

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
            className="text-background text-2xl leading-[1.2] font-medium tracking-wide uppercase md:text-4xl"
          >
            {kicker}
          </motion.h2>
        </div>

        {/* Three-column paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {paragraphs.map((paragraph, index) => (
            <Paragraph key={index}>{paragraph}</Paragraph>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
