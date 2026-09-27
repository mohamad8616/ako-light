"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { S34KickerSectionContent } from "@/lib/repositories/s34-page";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import { imageZoomClass } from "@/utility/animations";
import Image from "next/image";

const CONCEPT_IMAGE =
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_06-1.jpg";

// Server-fetched concept copy (myPlan.md Part C): the page resolves the
// S34PageSection "conceptSection" row and passes it down — the kicker heading
// and all paragraphs come from the database instead of t("s34.concept.*").
// The section photo is hardcoded (not translation content).
interface S34ConceptProps {
  content: S34KickerSectionContent;
}

export default function S34Concept({ content }: S34ConceptProps) {
  const { lang } = useLanguage();

  const kicker = pick(content.kicker, lang);
  // The first three paragraphs render in the top grid; the rest beside the
  // image (the seeded content has five: three + two).
  const [lead1, lead2, lead3, ...rest] = content.paragraphs.map((paragraph) =>
    pick(paragraph, lang),
  );

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      {/* Title */}
      <div className="overflow-hidden lg:w-1/3">
        <SectionTitle>{kicker}</SectionTitle>
      </div>

      {/* Two-column paragraphs */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
        <Paragraph>{lead1}</Paragraph>
        <Paragraph>{lead2}</Paragraph>
        <Paragraph>{lead3}</Paragraph>
      </div>

      {/* Image */}
      <div className="h-full gap-20 lg:flex">
        <SectionImage className="x mt-16 flex-5 md:mt-20">
          <Image
            src={CONCEPT_IMAGE}
            alt={kicker}
            fill
            className={imageZoomClass({ scale: 105 })}
          />
        </SectionImage>

        {/* Remaining paragraphs */}
        <div className="mt-16 flex h-full flex-2 flex-col md:mt-20 md:gap-10">
          {rest.map((paragraph, index) => (
            <Paragraph key={index}>{paragraph}</Paragraph>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
