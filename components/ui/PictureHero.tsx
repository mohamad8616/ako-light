"use client";

import HeroSectionText from "@/components/ui/HeroSectionText";
import Image from "next/image";

type PictureHeroProps = {
  image: string;
  nameKey?: string;
  name?: string;
};

export default function PictureHero({
  image,
  nameKey,
  name: nameProp,
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

      <HeroSectionText firstLineKey={nameKey} firstLine={nameProp} />
    </section>
  );
}
