"use client";

import CollectionCard from "./CollectionCard";

const collections = [
  { name: "Ritual Gravity", year: "2026", slug: "ritual-gravity" },
  { name: "Timeless", year: "2025", slug: "timeless" },
  { name: "Home Collection", year: "2026", slug: "home-collection" },
  { name: "Stone", year: "2024", slug: "stone" },
  { name: "Signature", year: "2023", slug: "signature" },
  { name: "Experimental", year: "2022", slug: "experimental" },
].map((c) => ({ ...c, image: `https://picsum.photos/seed/${c.slug}/700/440` }));

export default function CollectionsGrid() {
  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {collections.map((collection, i) => (
            <CollectionCard key={collection.slug} index={i} {...collection} />
          ))}
        </div>
      </div>
    </section>
  );
}
