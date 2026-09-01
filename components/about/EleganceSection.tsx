"use client";

import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { elegance } from "@/lib/data/about";

export default function EleganceSection() {
  return (
    <HomepageSection className="w-full py-20 md:py-28">

        {/* Title */}
        <div className="overflow-hidden lg:w-1/5">
          <SectionTitle>{elegance.title}</SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 lg:grid-cols-3 md:gap-10">
          {elegance.paragraphs.map((text, i) => (
            <Paragraph key={i}>{text}</Paragraph>
          ))}
        </div>

    </HomepageSection>
  );
}
