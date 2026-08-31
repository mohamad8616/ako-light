import HeroSectionText from "@/components/ui/HeroSectionText";
import Image from "next/image";

export default function PictureHero({ image,name }: { image: string, name: string }) {
  return (
    <section className="relative flex h-screen w-full items-end bg-black">
      <Image
        src={image}
        alt={name}
        fill
        priority={true}
        className="object-cover"
      />

      {/* 30% dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <HeroSectionText firstLine={name} />
    </section>
  );
}
