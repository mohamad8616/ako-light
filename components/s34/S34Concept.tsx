"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";

const CONCEPT_IMAGE =
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_06-1.jpg";

export default function S34Concept() {
  const { t } = useLanguage();

  const kicker = t("s34.concept.kicker");
  const p1 = t("s34.concept.p1");
  const p2 = t("s34.concept.p2");
  const p3 = t("s34.concept.p3");
  const p4 = t("s34.concept.p4");
  const p5 = t("s34.concept.p5");

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      {/* Title */}
      <div className="overflow-hidden lg:w-1/3">
        <SectionTitle>{kicker}</SectionTitle>
      </div>

      {/* Two-column paragraphs */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
        <Paragraph>{p1}</Paragraph>
        <Paragraph>{p2}</Paragraph>
        <Paragraph>{p3}</Paragraph>
      </div>

      {/* Image */}
      <div className="h-full gap-20 lg:flex">
        <SectionImage className="x mt-16 flex-5 md:mt-20">
          <Image
            src={CONCEPT_IMAGE}
            alt={kicker}
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </SectionImage>

        {/* Remaining paragraphs */}
        <div className="mt-16 flex h-full flex-2 flex-col md:mt-20 md:gap-10">
          <Paragraph>{p4}</Paragraph>
          <Paragraph>{p5}</Paragraph>
        </div>
      </div>
    </HomepageSection>
  );
}
