/* eslint-disable @next/next/no-img-element */
"use client";

import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";

const paragraphs = [
  "The brand searches for extraordinary materials from all over the world, looking for their expression, giving value to their natural characteristics and production criteria. It explores unique materials that can tell a story that doesn't need to be told through words as it is understood simply by getting in contact with it. HENGE believes the core of Made in Italy is found in the small craft shops which maintain the secrets of Italian excellence.",
  "Knowledge has been passed down from generation to generation to survive the modern era and industrial production. HENGE looks for these secrets and turns them into its trademark, adding the techniques impressed in the hands of the best Italian artisans to the vision of the great designers it works with.",
  "The brand travels relentlessly and goes beyond physical and geographical borders. HENGE goes after materials and their stories with great instinct. It looks for the rarest and most expressive materials found in different cultures and in the furthest international landscapes, linking wood, stones, metals, glass, leather and fabric from the most distant parts of the world.",
];

export default function EleganceSection() {
  return (
    <section className="w-full py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/5">
          <SectionTitle>A Paradigm of Contemporary Elegance</SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {paragraphs.map((text, i) => (
            <Paragraph key={i}>{text}</Paragraph>
          ))}
        </div>
      </div>
     
    </section>
  );
}
