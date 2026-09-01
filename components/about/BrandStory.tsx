"use client";

import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import { brandStory } from "@/lib/data/about";
import Image from "next/image";

export default function BrandStory() {
  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10 space-y-20 border-t">
        {/* Title */}
        <div className="overflow-hidden lg:w-2/6">
          <SectionTitle className="font-medium">{brandStory.title}</SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 lg:grid-cols-3 md:gap-10">
          {brandStory.introParagraphs.map((text, i) => (
            <Paragraph key={i}>{text}</Paragraph>
          ))}
        </div>

        {/*  image with corner badge with text */}
        <div className="mt-16 lg:flex flex-row-reverse items-center justify-between gap-5 space-y-5 lg:space-y-0 md:mt-30 lg:mb-60">
          <SectionImage className="flex-4 md:mt-20">
            <Image
              src={brandStory.imageBlock1.image}
              alt={brandStory.imageBlock1.imageAlt}
              fill
              className="object-cover"
            />
          </SectionImage>
          <div className="flex-2 space-y-5 lg:px-14 text-xs">
            {brandStory.imageBlock1.paragraphs.map((text, i) => (
              <Paragraph key={i} className={i === 0 ? "text-xs" : undefined}>
                {text}
              </Paragraph>
            ))}
          </div>
        </div>

        {/* Text-Below / image-top */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 md:mt-20 lg:gap-12">
          <SectionImage>
            <Image
              src={brandStory.imageBlock2.image}
              alt={brandStory.imageBlock2.imageAlt}
              fill
              className="object-cover"
            />
          </SectionImage>
          {brandStory.imageBlock2.paragraphs.map((text, i) => (
            <Paragraph key={i}>{text}</Paragraph>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
