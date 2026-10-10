"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { ResolvedCatalogueFeature } from "@/lib/repositories/homepage-features";
import { Paragraph } from "@/utility/Paragraph";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import Image from "next/image";
import HomepageSection, { EASE } from "../../utility/HomepageSection";
import AnimatedDownloadCircle from "../ui/AnimateDownloadCircle";
import PlusTextBtn from "../ui/PlusTextBtn";

interface CatalogueSectionProps {
  /**
   * Server-resolved slot data (`getCatalogueFeature()`); `null` renders nothing,
   * exactly like a slot saved with `enabled: false`.
   */
  data: ResolvedCatalogueFeature | null;
}

export default function CatalogueSection({ data }: CatalogueSectionProps) {
  const { t, lang } = useLanguage();

  if (!data || !data.enabled) return null;

  // The title and the PDF href belong to the referenced CatalogueItem, so the
  // CTA label is composed from the static "Download" word plus that title —
  // identical copy to before, but correct after the reference is repointed.
  const ctaText = `${t("catalogue.download")} ${data.title}`;

  // The paragraph is editable in the admin panel (Homepage → Catalogue).
  // An EMPTY list is not "no paragraph" — it means "use the built-in default
  // text", which is what every row saved before the field existed relies on.
  // So the fallback lives here, where the dictionary is available.
  const paragraphs =
    data.paragraphs.length > 0
      ? data.paragraphs.map((paragraph) => pick(paragraph, lang))
      : [t("catalogue.description")];

  return (
    <HomepageSection className="grid w-full grid-cols-1 gap-3 py-20 md:py-28 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6">
      {/* Row 1: Text column + Image column */}

      {/* FOR SMALL SCREEN */}
      <div className="lg:hidden">
        <SectionSubTitle>{t("catalogue.kicker")}</SectionSubTitle>
        <div className="mt-3 mb-5 overflow-hidden">
          <SectionTitle>{data.title}</SectionTitle>
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col justify-start space-y-6 xl:col-span-8">
        {/* FOR LARGE SCREEN */}
        <div className="hidden lg:block">
          <SectionSubTitle>{t("catalogue.kicker")}</SectionSubTitle>
          <div className="mt-3 mb-5 overflow-hidden">
            <SectionTitle>{data.title}</SectionTitle>
          </div>
        </div>

        <div className="space-y-6">
          {paragraphs.map((paragraph, index) => (
            <Paragraph key={index} className="xl:max-w-none">
              {paragraph}
            </Paragraph>
          ))}
        </div>
      </div>

      {/* Image column — small, portrait, matches the reference photo's proportions */}
      <div className="lg:col-span-6 lg:flex lg:justify-end xl:col-span-4">
        <div className="w-full lg:max-w-95">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
            className="group relative aspect-2/3 w-full overflow-hidden"
          >
            <Image
              src={data.image}
              alt="catalogue download"
              fill
              className="object-cover transition-transform duration-2500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />

            {/* Animated download circle */}
            <AnimatedDownloadCircle />
          </motion.div>
        </div>
      </div>

      {/* Row 2: CTA — below image, aligned with image column */}
      <motion.div
        initial={{ y: 16 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-2 lg:col-span-6 lg:col-start-7 lg:ms-auto lg:max-w-95"
      >
        <PlusTextBtn
          text={ctaText}
          textColor="text-background font-medium"
          href={data.downloadHref}
          aria-label={t("catalogue.downloadAria").replace(
            "{title}",
            data.title,
          )}
          className="z-999"
        />
      </motion.div>
    </HomepageSection>
  );
}
