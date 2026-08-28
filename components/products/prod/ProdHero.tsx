import type { Product } from "@/lib/data/prods";

export default function ProductHero({ product }: { product: Product }) {
  return (
    <section className="relative flex h-screen w-full items-end bg-black">
      <img
        src={product.heroImage}
        alt={product.name}
        className="absolute inset-0 m-auto h-[55%] w-auto max-w-[85%] object-contain md:h-[65%] lg:h-[70%]"
      />

      <h1 className="font-din relative z-10 px-6 pb-16 text-5xl font-bold tracking-tight text-white uppercase md:px-12 md:pb-20 md:text-7xl lg:px-20 xl:px-[8.5vw]">
        {product.name}
      </h1>
    </section>
  );
}
