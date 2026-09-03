"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import Image from "next/image";
import HomepageSection, { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

export default function CatalogueSection() {
  const { catalogue } = homepageSections;
  const { t } = useLanguage();

  return (
    <HomepageSection className="grid w-full grid-cols-1 gap-3 py-20 md:py-28 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6">
      {/* Row 1: Text column + Image column */}

      {/* FOR SMALL SCREEN */}
      <div className="lg:hidden">
        <SectionSubTitle>{t("catalogue.kicker")}</SectionSubTitle>
        <div className="mt-3 mb-5 overflow-hidden">
          <SectionTitle>{t("catalogue.title")}</SectionTitle>
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col justify-start lg:col-span-6">
        {/* FOR LARGE SCREEN */}
        <div className="hidden lg:block">
          <SectionSubTitle>{t("catalogue.kicker")}</SectionSubTitle>
          <div className="mt-3 mb-5 overflow-hidden">
            <SectionTitle>{t("catalogue.title")}</SectionTitle>
          </div>
        </div>

        <Paragraph>{t("catalogue.description")}</Paragraph>
      </div>

      {/* Image column — small, portrait, matches the reference photo's proportions */}
      <div className="lg:col-span-6 lg:flex lg:justify-end">
        <div className="w-full lg:max-w-95">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
            className="group relative aspect-2/3 w-full"
          >
            <Image
              src={catalogue.image}
              alt="S34/5"
              fill
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
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
          text={t("catalogue.cta")}
          textColor="text-background font-medium"
          href="#"
          className="z-999"
        />
      </motion.div>
    </HomepageSection>
  );
}

function AnimatedDownloadCircle() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-background flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
        <div className="relative h-4 w-4 overflow-hidden">
          <ArrowDown
            size={16}
            strokeWidth={1.5}
            className="absolute inset-0 text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-full"
          />
          <ArrowDown
            size={16}
            strokeWidth={1.5}
            className="absolute inset-0 -translate-y-full text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
          />
        </div>
      </div>
    </div>
  );
}
