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
//
// Pass D.1 follow-up: the hero FILM is no longer a stock file in /public. The
// page reads the homepage hero slot and passes its video down, so /s34 shows
// whatever the operator uploaded — the same film as the homepage hero.
interface S34HeroProps {
  content: S34HeroContent;
  /** The homepage hero slot's video, or null when none is configured. */
  videoSrc?: string | null;
}

export default function S34Hero({ content, videoSrc }: S34HeroProps) {
  const { lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.title, lang)}
      secondLine={pick(content.subtitle, lang)}
      videoSrc={videoSrc ?? undefined}
    />
  );
}
