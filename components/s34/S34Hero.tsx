"use client";

import HeroVideo from "@/components/ui/heroVideo/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { S34HeroContent } from "@/lib/repositories/s34-page";

// Server-fetched hero copy (myPlan.md Part C): the page resolves the
// S34PageSection "heroSection" row and passes it down, so the headline lines
// come from the database instead of HeroVideo's firstLineKey/secondLineKey
// translation lookup. The play button label stays chrome — HeroVideo shows it
// only when `btn` is provided; S34's hero never had one.
interface S34HeroProps {
  content: S34HeroContent;
}

export default function S34Hero({ content }: S34HeroProps) {
  const { lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.title, lang)}
      secondLine={pick(content.subtitle, lang)}
      videoSrc="/videos/hero.mp4"
    />
  );
}
