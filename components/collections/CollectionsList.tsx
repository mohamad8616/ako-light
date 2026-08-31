"use client";

import { collections } from "@/lib/data/collections";
import HomepageSection from "@/utility/HomepageSection";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

// const collections = [
//   { name: "Ritual Gravity", year: "2026", slug: "ritual-gravity" },
//   { name: "Timeless", year: "2025", slug: "timeless" },
//   { name: "Home Collection", year: "2026", slug: "home-collection" },
//   { name: "Stone", year: "2024", slug: "stone" },
//   { name: "Signature", year: "2023", slug: "signature" },
//   { name: "Experimental", year: "2022", slug: "experimental" },
// ].map((c, i) => ({
//   ...c,
//   image: `https://loremflickr.com/800/1000/architecture?lock=${i + 1}`,
// }));

export default function CollectionsList() {
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
      {collections.map((collection, i) => (
        <Row
          key={collection.id}
          index={i}
          animateOnLoad={i < ROWS_ON_LOAD}
          route="collections"
          {...collection}
        />
      ))}
    </HomepageSection>
  );
}
