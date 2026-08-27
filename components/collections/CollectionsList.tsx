"use client";

import HomepageSection from "@/utility/HomepageSection";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

const collections = [
  { name: "Ritual Gravity", year: "2026", slug: "ritual-gravity" },
  { name: "Timeless", year: "2025", slug: "timeless" },
  { name: "Home Collection", year: "2026", slug: "home-collection" },
  { name: "Stone", year: "2024", slug: "stone" },
  { name: "Signature", year: "2023", slug: "signature" },
  { name: "Experimental", year: "2022", slug: "experimental" },
].map((c) => ({ ...c, image: `https://picsum.photos/seed/${c.slug}/700/440` }));

export default function CollectionsList() {
  return (
    <HomepageSection animateOnLoad className="bg-background w-full pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {collections.map((collection, i) => (
          <Row key={collection.slug} index={i} animateOnLoad={i < ROWS_ON_LOAD} route="collections" slug={collection.id} {...collection} />
        ))}
      </div>
    </HomepageSection>
  );
}