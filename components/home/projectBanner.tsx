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

/**
 * ── HOW THE SEAM WITH THE NEXT SECTION WORKS ────────────────────────────────
 *
 * This section is TWO bands stacked in one box:
 *
 *   1. the light band (`bg-background-secondary`): kicker, title, photo;
 *   2. the dark band (`bg-background`): the photo's tail + the "Discover" CTA.
 *
 * The photo's bottom margin is NEGATIVE, so it does not count towards the light
 * band's height: the light band ends *above* the photo's bottom edge and the
 * photo hangs down over the dark band. That is the "the photo overlaps the next
 * section" look — and because the dark band uses the same `background` token as
 * `ProjectWithDarkBackground`, the two dark areas are indistinguishable and the
 * seam disappears. The following section is pulled flush by `mb-0` (which
 * overrides `<main>`'s `space-y-*`, a zero-specificity `:where()` rule).
 *
 * ── WHY THE OLD VERSION NEVER OVERLAPPED ────────────────────────────────────
 *
 * It kept the whole box light and tried to reach the next section with
 * `-bottom-80` (a RELATIVE offset: it moves the paint, never the layout box) and
 * with `-mb` on the photo — but the CTA came after the photo in the flow, so the
 * negative margin only pulled the CTA up. Nothing ever left the section, and the
 * dark section (later in the DOM) painted over it anyway: its `z-index` escape
 * was impossible because `HomepageSection`'s reveal animation leaves an identity
 * `transform: matrix(1,0,0,1,0,0)` behind, which is a stacking context that
 * traps every `z-*` inside it. No z-index is needed now: the overlap lives
 * entirely INSIDE this section's own box.
 */
const PHOTO_BLEED = {
  /**
   * A percentage margin is measured against the containing block's WIDTH, so
   * "10% of the photo's height" has to be restated in terms of the photo's
   * aspect ratio: 16/10 → 6.25% of the width, 16/9 → 5.625% of the width.
   * `sm` is where the photo switches from 16/10 to 16/9.
   */
  photo: "-mb-[6.25%] sm:-mb-[5.625%]",
  /**
   * The CTA's top padding is the same bleed PLUS a fixed gap. Both percentages
   * resolve against the same containing block (the section's inner width), so
   * the CTA stays exactly 2.5rem below the photo's bottom edge at any width
   * instead of colliding with the part of the photo hanging above it.
   */
  cta: "pt-[calc(6.25%+2.5rem)] sm:pt-[calc(5.625%+2.5rem)]",
} as const;

export default function ProjectBanner({ data }: ProjectBannerProps) {
  const { t, lang } = useLanguage();

  if (!data || !data.enabled) return null;

  const title = pick(data.title, lang);

  return (
    // `mb-0`: the dark band below is the visual top of the NEXT section, so the
    // two must touch. Without it `<main>`'s `space-y-*` would open a light gap
    // between them.
    <section className="bg-background relative mb-0 w-full">
      {/* ── Light band ───────────────────────────────────────────────────── */}
      <div className="bg-background-secondary pt-20 md:pt-28">
        {/* Fluid width from HomepageSection itself — no duplicated container
            (the old explicit max-w-1600 also double-applied the gutters). */}
        <HomepageSection>
          {/* Title */}
          <div className="overflow-hidden">
            <SectionSubTitle>{pick(data.kicker, lang)}</SectionSubTitle>
            <SectionTitle>{title}</SectionTitle>
          </div>

          {/* Photo — kept inside the same page container as the title (not
              full viewport width), and bled BELOW the light band by the
              negative bottom margin: as the band's last child its bottom
              margin escapes the band's auto height, so the band's box ends
              `bleed` px above the photo's bottom edge and the dark band is
              pulled up underneath the overhang. `z-10` keeps the photo above
              that dark background — the light band's own background must stay
              BELOW it, or the overhang would sit on light again. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
            className={`group relative z-10 mt-10 aspect-16/10 w-full overflow-hidden sm:aspect-video md:mt-14 ${PHOTO_BLEED.photo}`}
          >
            <Image
              src={data.image}
              alt={title}
              fill
              className="object-cover transition-transform duration-3000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
          </motion.div>
        </HomepageSection>
      </div>

      {/* ── Dark band ────────────────────────────────────────────────────────
          Holds the photo's tail and the CTA. The CTA is `text-white` by default,
          which only became readable once it moved onto this band (it used to sit
          on the light background, invisible). */}
      <div className="bg-background">
        <HomepageSection>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            className={PHOTO_BLEED.cta}
          >
            <PlusTextBtn
              href={data.ctaHref}
              text={t("istra.cta")}
              // `w-fit` instead of a full-bleed flex row: the button hugs its
              // own text and sits on the LEFT edge of the content, and its hit
              // area stops being the whole page width.
              className="flex! w-fit!"
            />
          </motion.div>
        </HomepageSection>
      </div>
    </section>
  );
}
