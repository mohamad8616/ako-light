"use client";

import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResolvedProjectDarkBackgroundFeature } from "@/lib/repositories/homepage-features";
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
  // Admin-editable in /admin/homepage → "Project (dark background)"; an empty
  // override keeps the built-in dictionary word.
  const label = data.label ? pick(data.label, lang) : t("vocla.hLife");

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
      /**
       * `label`, NOT `children`: SplitBanner gives it its own row above the
       * photo, so the label sits above the whole content row while the title
       * starts level with the photo. Passing it as `children` (as this
       * component used to) is silently dropped, because SplitBanner no longer
       * has a `children` prop at all.
       *
       * Typography follows the reference brand: a high-contrast serif for the
       * "H-Life" word in English, Noora in Persian. The grid's row gap supplies
       * the space below it, so no margin here.
       */
      label={
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className={[
            "block text-3xl text-background-secondary md:text-5xl",
            lang === "fa" ? "font-noora" : "font-serif font-semibold tracking-tight",
          ].join(" ")}
        >
          {label}
        </motion.span>
      }
    />
  );
}
