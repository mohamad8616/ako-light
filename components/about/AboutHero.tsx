"use client";

import HeroVideo from "@/components/ui/heroVideo/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutHeroContent } from "@/lib/repositories/about-page";

// The headline lines are fetched from AboutPageSection and the looping
// background video (with its preloader poster) is configured independently
// from the homepage hero.
interface AboutHeroProps {
  content: AboutHeroContent;
  /** About page's independent looping hero background video. */
  videoSrc?: string | null;
  /** Frame painted before that video buffers — NULL = the video's first frame. */
  posterSrc?: string | null;
}

export default function AboutHero({ content, videoSrc, posterSrc }: AboutHeroProps) {
  const { t, lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.firstLine, lang)}
      secondLine={pick(content.secondLine, lang)}
      btn={t("about.hero.play")}
      videoSrc={videoSrc ?? undefined}
      posterSrc={posterSrc ?? undefined}
    />
  );
}
