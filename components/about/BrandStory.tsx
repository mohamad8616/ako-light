"use client";

import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";
import { aboutImages } from "@/lib/data/about";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Image from "next/image";

export default function BrandStory() {
  const { t } = useLanguage();
  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10 space-y-20 border-t">
        {/* Title */}
        <div className="overflow-hidden lg:w-2/6">
          <SectionTitle className="font-medium">{t("about.brandStory.title")}</SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 lg:grid-cols-3 md:gap-10">
          {["1", "2", "3", "4"].map((n) => (
            <Paragraph key={n}>{t(`about.brandStory.intro${n}`)}</Paragraph>
          ))}
        </div>

        {/*  image with corner badge with text */}
        <div className="mt-16 lg:flex flex-row-reverse items-center justify-between gap-5 space-y-5 lg:space-y-0 md:mt-30 lg:mb-60">
          <SectionImage className="flex-4 md:mt-20">
            <Image
              src={aboutImages.brandStoryBlock1}
              alt={t("about.brandStory.block1Alt")}
              fill
              className="object-cover"
            />
          </SectionImage>
          <div className="flex-2 space-y-5 lg:px-14 text-xs">
            {["1", "2"].map((n) => (
              <Paragraph key={n} className={n === "1" ? "text-xs" : undefined}>
                {t(`about.brandStory.block1.p${n}`)}
              </Paragraph>
            ))}
          </div>
        </div>

        {/* Text-Below / image-top */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 md:mt-20 lg:gap-12">
          <SectionImage>
            <Image
              src={aboutImages.brandStoryBlock2}
              alt={t("about.brandStory.block2Alt")}
              fill
              className="object-cover"
            />
          </SectionImage>
          <Paragraph>{t("about.brandStory.block2.p1")}</Paragraph>
        </div>
      </div>
    </HomepageSection>
  );
}