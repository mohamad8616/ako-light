"use client";

import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutEleganceContent } from "@/lib/repositories/about-page";

// Server-fetched elegance copy (myPlan.md Part C): the page resolves the
// AboutPageSection "eleganceSection" row and passes it down — no more
// t("about.elegance.*").
interface EleganceSectionProps {
  content: AboutEleganceContent;
}

export default function EleganceSection({ content }: EleganceSectionProps) {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="w-full py-20 md:py-28">
      {/* Title */}
      <div className="overflow-hidden lg:w-1/5">
        <SectionTitle>{pick(content.title, lang)}</SectionTitle>
      </div>

      {/* Three-column paragraph grid */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 lg:grid-cols-3 md:gap-10">
        {content.paragraphs.map((paragraph, index) => (
          <Paragraph key={index}>{pick(paragraph, lang)}</Paragraph>
        ))}
      </div>
    </HomepageSection>
  );
}