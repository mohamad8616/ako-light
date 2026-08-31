import type { FlagshipWithDetail } from "@/lib/data/flagships";
import Image from "next/image";

export default function FlagshipHero({ flagship }: { flagship: FlagshipWithDetail }) {
  return (
    <section className="relative flex h-screen w-full items-end overflow-hidden">
      <Image
        src={flagship.heroImage}
        alt={flagship.name}
        fill
        className="object-cover"
      />
      {/* Darkens the lower portion so the heading stays legible over any photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <h1 className="font-din relative z-10 px-6 pb-16 text-5xl font-bold tracking-tight text-white uppercase md:px-12 md:pb-24 md:text-7xl lg:px-20 xl:px-[8.5vw]">
        {flagship.name}
      </h1>
    </section>
  );
}
