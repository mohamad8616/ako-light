﻿"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { AboutBrandStoryContent } from "@/lib/repositories/about-page";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";

// Server-fetched brand-story copy (myPlan.md Part C): the page resolves the
// AboutPageSection "brandStorySection" row and passes it down — the title,
// intro grid, block paragraphs, image URLs and image alt texts all come from
// the database instead of t("about.brandStory.*"). Image URLs are editable on
// the about admin page.
interface BrandStoryProps {
  content: AboutBrandStoryContent;
}

export default function BrandStory({ content }: BrandStoryProps) {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10 space-y-20 border-t">
        {/* Title */}
        <div className="overflow-hidden lg:w-2/6">
          <SectionTitle className="font-medium">
            {pick(content.title, lang)}
          </SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:gap-10 lg:grid-cols-3">
          {content.paragraphs.map((paragraph, index) => (
            <Paragraph key={index}>{pick(paragraph, lang)}</Paragraph>
          ))}
        </div>

        {/*  image with corner badge with text */}
        <div className="mt-16 flex-row-reverse items-center justify-between gap-5 space-y-5 md:mt-30 lg:mb-60 lg:flex lg:space-y-0">
          <SectionImage className="flex-4 md:mt-20">
            <Image
              src={content.block1Image}
              alt={pick(content.block1Alt, lang)}
              fill
              className="object-cover"
            />
          </SectionImage>
          <div className="flex-2 space-y-5 text-xs lg:px-14">
            {content.block1Paragraphs.map((paragraph, index) => (
              <Paragraph
                key={index}
                className={index === 0 ? "text-xs" : undefined}
              >
                {pick(paragraph, lang)}
              </Paragraph>
            ))}
          </div>
        </div>

        {/* Text-Below / image-top */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 md:mt-20 lg:gap-12">
          <SectionImage>
            <Image
              src={content.block2Image}
              alt={pick(content.block2Alt, lang)}
              fill
              className="object-cover"
            />
          </SectionImage>
          <Paragraph>{pick(content.block2Paragraph, lang)}</Paragraph>
        </div>
      </div>
    </HomepageSection>
  );
}
