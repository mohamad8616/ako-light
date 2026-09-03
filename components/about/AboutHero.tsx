"use client";

import HeroVideo from "@/components/ui/HeroVideo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Client wrapper so the /about hero copy resolves through the translation
// system (app/about/page.tsx is a server component and cannot call
// useLanguage) - same pattern as components/home/HeroSection.tsx.
export default function AboutHero() {
  const { t } = useLanguage();
  return (
    <HeroVideo
      firstLine={t("about.hero.firstLine")}
      secondLine={t("about.hero.secondLine")}
      btn={t("about.hero.play")}
      videoSrc="/videos/hero.mp4"
    />
  );
}
