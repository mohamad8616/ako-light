"use client";

import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResolvedProjectBannerFeature } from "@/lib/repositories/homepage-features";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import Image from "next/image";
import HomepageSection, { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

interface ProjectBannerProps {
  /**
   * Server-resolved slot data (`getProjectBannerFeature()`); `null` renders
   * nothing, exactly like a slot saved with `enabled: false`.
   */
  data: ResolvedProjectBannerFeature | null;
}

export default function ProjectBanner({ data }: ProjectBannerProps) {
  const { t, lang } = useLanguage();

  if (!data || !data.enabled) return null;

  const title = pick(data.title, lang);

  return (
    <section className="bg-background-secondary relative -bottom-18 w-full pt-20 pb-0 md:pt-28 lg:-bottom-80">
      {/* Fluid width from HomepageSection itself — no duplicated container
          (the old explicit max-w-1600 also double-applied the gutters). */}
      <HomepageSection>
        {/* Title */}
        <div className="overflow-hidden">
          <SectionSubTitle>{pick(data.kicker, lang)}</SectionSubTitle>
          <SectionTitle>{title}</SectionTitle>
        </div>

        {/* Image — kept inside the same page container as the title (not
            full viewport width), but bled below this section's own box via
            a negative bottom margin so it spills onto whatever follows. */}

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
          className="group relative z-10 mt-10 -mb-16 aspect-16/10 w-full overflow-hidden sm:aspect-video md:mt-14 md:-mb-16 lg:-mb-18"
        >
          <Image
            src={data.image}
            alt={title}
            fill
            className="object-cover transition-transform duration-3000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </motion.div>

        {/* Discover CTA, ~30px below the image */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
          className="relative z-20 mt-24"
        >
          <PlusTextBtn href={data.ctaHref} text={t("istra.cta")} className="flex!" />
        </motion.div>
      </HomepageSection>
    </section>
  );
}

