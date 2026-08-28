import HeroSectionText from "@/components/ui/HeroSectionText";
import type { Product } from "@/lib/data/prods";

export default function ProductHero({ product }: { product: Product }) {
  return (
    <section className="relative flex h-screen w-full items-end bg-black">
      <img
        src={product.heroImage}
        alt={product.name}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 30% dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <HeroSectionText firstLine={product.name} />
    </section>
  );
}
