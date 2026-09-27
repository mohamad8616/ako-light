"use client";

import HomepageSection from "../../utility/HomepageSection";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutSubtitleContent } from "@/lib/repositories/about-page";

// Server-fetched subtitle (myPlan.md Part C): the page resolves the
// AboutPageSection "subtitleSection" row and passes it down — no more
// t("about.subtitle").
interface AboutHeroVideoProps {
  content: AboutSubtitleContent;
}

const AboutHeroVideo = ({ content }: AboutHeroVideoProps) => {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="bg-background-secondary flex h-20 items-start justify-start lg:-mt-7">
      <p className="font-jetbrains ms-6 w-3/4 text-sm leading-normal font-light text-gray-500 lg:ms-12 lg:w-1/4">
        {pick(content.paragraph, lang)}
      </p>
    </HomepageSection>
  );
};

export default AboutHeroVideo;