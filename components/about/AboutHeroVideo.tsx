"use client";

import HomepageSection from "../../utility/HomepageSection";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const AboutHeroVideo = () => {
  const { t } = useLanguage();
  return (
    <HomepageSection className="bg-background-secondary flex h-20 items-start justify-start lg:-mt-7">
      <p className="font-jetbrains ms-6 w-3/4 text-sm leading-normal font-light text-gray-500 lg:ms-12 lg:w-1/4">
        {t("about.subtitle")}
      </p>
    </HomepageSection>
  );
};

export default AboutHeroVideo;