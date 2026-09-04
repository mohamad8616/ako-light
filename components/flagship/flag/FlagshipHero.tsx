"use client";

import type { FlagshipWithDetail } from "@/lib/data/flagships";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function FlagshipHero({
  flagship,
}: {
  flagship: FlagshipWithDetail;
}) {
  const { lang } = useLanguage();
  const name = pick(flagship.name, lang);
  console.log(flagship.image);
  return (
    <section className="relative flex h-screen w-full items-end overflow-hidden">
      <Image
        src={flagship.heroImage}
        alt={name}
        fill
        // priority
        // sizes="100vw"
        className="object-cover"
      />
      {/* Darkens the lower portion so the heading stays legible over any photo */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

      <h1
        className={cn(
          "relative z-10 px-6 pb-16 text-5xl font-bold tracking-tight text-white uppercase md:px-12 md:pb-24 md:text-7xl lg:px-20 xl:px-[8.5vw]",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {name}
      </h1>
    </section>
  );
}
