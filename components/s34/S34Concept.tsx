"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";

export default function S34Concept() {
  const { concept } = s34Sections;

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28 ">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/3">
          <SectionTitle>{concept.kicker}</SectionTitle>
        </div>

        {/* Two-column paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {concept.paragraphs.slice(0, 3).map((p, i) => (
            <Paragraph key={i}>{p}</Paragraph>
          ))}
        </div>

        {/* Image */}
        <div className="lg:flex h-full">
          <SectionImage className="mt-16 md:mt-20 flex-5">
            <Image
              src={concept.image}
              alt={concept.kicker}
              fill
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
          </SectionImage>

          {/* Remaining paragraphs */}
          <div className="mt-16 flex-2 md:mt-20  md:gap-10 flex flex-col h-full">
            {concept.paragraphs.slice(3).map((p, i) => (
              <Paragraph key={i}>{p}</Paragraph>
            ))}
          </div>
        </div>
      
    </HomepageSection>
  );
}
