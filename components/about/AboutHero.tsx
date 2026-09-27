"use client";

import HeroVideo from "@/components/ui/heroVideo/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutHeroContent } from "@/lib/repositories/about-page";

// Server-fetched hero copy (myPlan.md Part C): the page resolves the
// AboutPageSection "heroSection" row and passes it down, so the headline lines
// come from the database instead of t("about.hero.*"). The play button label
// is UI chrome and stays in the translation dictionary (Part A classification).
interface AboutHeroProps {
  content: AboutHeroContent;
}

export default function AboutHero({ content }: AboutHeroProps) {
  const { t, lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.firstLine, lang)}
      secondLine={pick(content.secondLine, lang)}
      btn={t("about.hero.play")}
      videoSrc="/videos/hero.mp4"
    />
  );
}
