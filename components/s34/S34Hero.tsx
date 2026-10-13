"use client";

import HeroVideo from "@/components/ui/heroVideo/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { S34HeroContent } from "@/lib/repositories/s34-page";

// S34 hero copy comes from its section row. Its background video (with its
// preloader poster) is configured independently from the homepage and About
// heroes.
interface S34HeroProps {
  content: S34HeroContent;
  /** S34's independent looping background video, if configured. */
  videoSrc?: string | null;
  /** Frame painted before that video buffers — NULL = the video's first frame. */
  posterSrc?: string | null;
}

export default function S34Hero({
  content,
  videoSrc,
  posterSrc,
}: S34HeroProps) {
  const { lang } = useLanguage();
  return (
    <HeroVideo
      firstLine={pick(content.title, lang)}
      secondLine={pick(content.subtitle, lang)}
      videoSrc={videoSrc ?? undefined}
      posterSrc={posterSrc ?? undefined}
    />
  );
}
