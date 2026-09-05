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
    <section className="relative flex h-screen w-full items-end bg-black">
      <Image
        src={image}
        alt={nameProp ?? ""}
        fill
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
