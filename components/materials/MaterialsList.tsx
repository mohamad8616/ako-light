"use client";

import HomepageSection from "@/utility/HomepageSection";
import type { MaterialCategory } from "@/lib/repositories/material-categories";
import Row from "../ui/Row";

export const ROWS_ON_LOAD = 2;

export default function MaterialsList({
  categories,
}: {
  categories: MaterialCategory[];
}) {
  return (
    <HomepageSection animateOnLoad className="bg-background w-full pb-20 md:pb-28">
      {categories.map((category, index) => (
        <Row
          route="materials"
          key={category.id}
          index={index}
          animateOnLoad={index < ROWS_ON_LOAD}
          slug={category.slug}
          name={category.name}
          image={category.image}
          width="40"
        />
      ))}
    </HomepageSection>
  );
}
