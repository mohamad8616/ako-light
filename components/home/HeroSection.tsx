"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HeroSectionText from "../ui/HeroSectionText";

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <Video />

      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

      {/* Hero copy — bottom-left aligned, tight leading between the two lines */}
      <HeroSectionText firstLine={t("hero.collection")} secondLine={t("hero.ritualGravity")} btn={t("hero.readMore")} />
    </section>
  );
}

function Video() {
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
}

