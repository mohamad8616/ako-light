"use client";

import HeroSectionText from "@/components/ui/HeroSectionText";
import type { Localized } from "@/lib/i18n/localized";
import Image from "next/image";

type PictureHeroProps = {
  image: string;
  nameKey?: string;
  name?: string;
  /**
   * Bilingual project name. Resolved reactively via the language context,
   * so the hero updates when the user toggles language without a reload.
   * Takes precedence over `name` / `nameKey` when provided.
   */
  nameLocalized?: Localized;
};

export default function PictureHero({
  image,
  nameKey,
  name: nameProp,
  nameLocalized,
}: PictureHeroProps) {
  return (
    // `100svh`, not `h-screen` — see components/home/HeroSection.tsx. A shared
    // `HeroSectionText` puts the scroll indicator at the hero's bottom edge, so
    // a `100vh` hero on a phone hides it behind the browser chrome.
    <section className="relative flex h-[100svh] w-full items-end bg-black">
      <Image
        src={image}
        alt={nameProp ?? ""}
        fill
        loading="eager"
        priority={true}
        className="object-cover"
      />

      {/* 30% dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <HeroSectionText
        firstLineKey={nameKey}
        firstLine={nameProp}
        firstLineLocalized={nameLocalized}
      />
    </section>
  );
}
