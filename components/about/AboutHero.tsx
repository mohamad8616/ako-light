"use client";

import HeroVideo from "@/components/ui/heroVideo/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutHeroContent } from "@/lib/repositories/about-page";

// Server-fetched hero copy (myPlan.md Part C): the page resolves the
// AboutPageSection "heroSection" row and passes it down, so the headline lines
// come from the database instead of t("about.hero.*"). The play button label
// is UI chrome and stays in the translation dictionary (Part A classification).
//
// Pass D.1 follow-up: the hero FILM is no longer a stock file in /public. The
// page reads the homepage hero slot and passes its video down, so /about shows
// whatever the operator uploaded — the same film as the homepage hero.
interface AboutHeroProps {
  content: AboutHeroContent;
  /** The homepage hero slot's video, or null when none is configured. */
  videoSrc?: string | null;
}

export default function AboutHero({ content, videoSrc }: AboutHeroProps) {
  const { t, lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.firstLine, lang)}
      secondLine={pick(content.secondLine, lang)}
      btn={t("about.hero.play")}
      videoSrc={videoSrc ?? undefined}
    />
  );
}
