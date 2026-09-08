"use client";

import AnimatedDownloadCircle from "@/components/ui/AnimateDownloadCircle";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import downloadCatalogue from "@/public/photos/downloadCatalogue.jpg";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";
import Link from "next/link";

// Placeholder — swap for the real S34/4 catalogue PDF URL.
const CATALOGUE_HREF = "#";

export default function CatalogueDownloadSection({ link }: { link: string }) {
  const { t } = useLanguage();

  return (
    <HomepageSection className="items-cente flex min-h-screen w-full px-6 py-20 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <div className="grid w-full grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center lg:gap-24">
        <div className="space-y-7">
          <SectionTitle className="font-medium tracking-tighter">
            {t("products.catalogue.label")}
          </SectionTitle>

          <Paragraph>{t("s34.concept.p1")}</Paragraph>
        </div>

        <div className="flex flex-col gap-6 lg:justify-self-end">
          {/* Catalogue cover photo — sized to match SplitBanner's photo
              (aspect-4/5 + fixed height on mobile, 3/4 column width on lg). */}
          <Link
            href={CATALOGUE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label={t("products.catalogue.aria")}
            className="group relative mx-auto block aspect-4/5 h-125.75 max-h-125.75 w-full overflow-hidden lg:aspect-3/4 lg:w-3/4"
          >
            <Image
              src={downloadCatalogue}
              alt={t("products.catalogue.aria")}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover group-hover:scale-102 transition-transform duration-1500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />

            {/* Download icon */}
            <AnimatedDownloadCircle />
          </Link>

          <PlusTextBtn
            href={link}
            text={t("products.catalogue.download")}
            textColor="text-background"
          />
        </div>
      </div>
    </HomepageSection>
  );
}
