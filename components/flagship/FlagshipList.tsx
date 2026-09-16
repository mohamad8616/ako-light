"use client";

import HomepageSection from "@/utility/HomepageSection";
import type { Flagship } from "@/lib/data/flagships";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

export default function FlagshipList({
  flagships,
}: {
  flagships: Flagship[];
}) {
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
        {flagships.map((flagship, i) => (
          <Row
            key={flagship.slug}
            index={i}
            animateOnLoad={i < ROWS_ON_LOAD}
            route="flagship"
            name={flagship.name}
            slug={flagship.slug}
            image={flagship.image}
          />
        ))}
    </HomepageSection>
  );
}
