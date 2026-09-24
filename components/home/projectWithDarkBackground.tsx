"use client";

import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResolvedProjectDarkBackgroundFeature } from "@/lib/repositories/homepage-features";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import SplitBanner from "./SplitBanner";

interface ProjectWithDarkBackgroundProps {
  /**
   * Server-resolved slot data (`getProjectDarkBackgroundFeature()`); `null`
   * renders nothing, exactly like a slot saved with `enabled: false`.
   */
  data: ResolvedProjectDarkBackgroundFeature | null;
}

export default function ProjectWithDarkBackground({
  data,
}: ProjectWithDarkBackgroundProps) {
  const { t, lang } = useLanguage();

  if (!data || !data.enabled) return null;

  const title = pick(data.title, lang);

  return (
    <SplitBanner
      sectionClassName="bg-background! text-background-secondary! relative w-full py-40 md:py-80"
      paragraphTextColor="text-background-secondary"
      titleTextColor="text-background-secondary"
      image={data.image}
      imageAlt={title}
      title={title}
      paragraphs={data.paragraphs.map((paragraph) => pick(paragraph, lang))}
      cta={
        <PlusTextBtn
          className="text-sm tracking-tight"
          text={t("vocla.cta")}
          href={data.ctaHref}
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
        className={cn(
          "font-din mb-12 block text-3xl text-white md:mb-16 md:text-5xl",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("vocla.hLife")}
      </motion.span>
    </SplitBanner>
  );
}
