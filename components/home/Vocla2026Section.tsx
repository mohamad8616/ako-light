"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import SplitBanner from "./SplitBanner";

export default function Vocla2026Section() {
  const { t } = useLanguage();
  const { vocla } = homepageSections;

  return (
    <SplitBanner
      sectionClassName="bg-background! relative w-full py-40 md:py-80"
      image={vocla.image}
      imageAlt={t("vocla.title")}
      title={t("vocla.title")}
      paragraphs={[
        <Paragraph key="p1" textColor="text-background-secondary">
          {t("vocla.p1")}
        </Paragraph>,
        <Paragraph key="p2" textColor="text-background-secondary">
          {t("vocla.p2")}
        </Paragraph>,
      ]}
      cta={
        <PlusTextBtn
          className="text-sm tracking-tight"
          text={t("vocla.cta")}
          href="#"
        />
      }
      imageClassName="bg-[#1c1c1e]"
      ctaDelay={0.45}
    >
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 block font-serif text-3xl text-white md:mb-16 md:text-5xl"
        >
          {t("vocla.hLife")}
        </motion.span>
    </SplitBanner>
  );
}
