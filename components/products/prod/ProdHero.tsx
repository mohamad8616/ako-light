import HeroSectionText from "@/components/ui/HeroSectionText";
import type { Product } from "@/lib/data/prods";
import Image from "next/image";

export default function ProductHero({ product }: { product: Product }) {
  return (
    <section className="relative flex h-screen w-full items-end bg-black">
      <Image
        src={product.heroImage}
        alt={product.name}
        fill
        priority={true}
        className="object-cover"
      />

      {/* 30% dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <HeroSectionText firstLine={product.name} />
    </section>
  );
}
