"use client";

import HomepageSection from "@/utility/HomepageSection";
import type { Material } from "@/lib/data/materials";
import Row from "../ui/Row";

export const ROWS_ON_LOAD = 2;

export default function MaterialsList({
  materials,
}: {
  materials: Material[];
}) {
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
        {materials.map((material, i) => (
          <Row
            route="materials"
            key={material.id}
            index={i}
            animateOnLoad={i < ROWS_ON_LOAD}
            slug={material.id}
            name={material.name}
            image={material.image}
            width={"40"}
          />
        ))}
    </HomepageSection>
  );
}
