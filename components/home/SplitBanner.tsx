"use client";

import { EASE } from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import Image from "next/image";
import HomepageSection from "../../utility/HomepageSection";

interface SplitBannerProps {
  image: string;
  imageAlt: string;
  kicker?: React.ReactNode;
  title: React.ReactNode;
  paragraphs: React.ReactNode[];
  cta: React.ReactNode;
  sectionClassName?: string;
  imageClassName?: string;
  ctaDelay?: number;
  reverse?: boolean;
  badge?: React.ReactNode;
  stretch?: boolean;
  /**
   * A section label (e.g. the "H-Life" word on the dark-background banner).
   * When provided it renders in its own narrow LEFT column, top-aligned with
   * the photo — both start at the section's first point, instead of the label
   * sitting full-width above the grid and pushing the photo down.
   */
  label?: React.ReactNode;
  page?: string;
  /** Text color class forwarded to the Paragraphs (defaults to Paragraph's own). */
  paragraphTextColor?: string;
  /** Text color class forwarded to the SectionTitle (defaults to SectionTitle's own). */
  titleTextColor?: string;
}

export default function SplitBanner({
  image,
  imageAlt,
  kicker,
  title,
  paragraphs,
  cta,
  page,
  sectionClassName,
  imageClassName,
  ctaDelay = 0.45,
  reverse = false,
  badge,
  stretch = false,
  label,
  paragraphTextColor,
  titleTextColor,
}: SplitBannerProps) {
  // With a label the grid is three columns (label + photo + text, 3+4+5);
  // without one it stays the classic two (photo + text, 5+7 or 7+5 reversed).
  const labelCol = "lg:col-span-3";
  const imageCol = label
    ? "lg:col-span-4"
    : reverse
      ? "lg:col-span-7"
      : "lg:col-span-5";
  const textCol = label
    ? "lg:col-span-5"
    : reverse
      ? "lg:col-span-5"
      : "lg:col-span-7";

  return (
    <HomepageSection className={`bg-background-secondary ${sectionClassName}`}>
      <div>
        <div
          className={`grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 ${stretch ? "lg:items-stretch" : ""}`}
        >
          {/* Section label — its own column, sharing the grid's first row so
              its top edge aligns with the photo's (and the text's). */}
          {label && <div className={labelCol}>{label}</div>}

          {/* Mobile only: kicker/subtitle row above the image */}
          <div className="lg:hidden">
            {page && <SectionSubTitle>{page}</SectionSubTitle>}
            {
              <SectionTitle className="font-noora" textColor={titleTextColor}>
                {title}
              </SectionTitle>
            }
          </div>

          <div className={`relative ${imageCol}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className={`group relative mx-auto aspect-4/5 h-125.75 max-h-125.75 w-full overflow-hidden lg:aspect-3/4 ${label ? "lg:w-full" : "lg:w-3/4"} ${imageClassName ?? ""}`}
            >
              <Image
                src={image}
                alt={imageAlt}
                fill
                className="object-cover transition-transform duration-3000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
              {badge}
            </motion.div>
          </div>

          <div
            className={`flex flex-col ${reverse ? "order-2 lg:py-2" : "justify-between"} ${textCol}`}
          >
            <div>
              <div className="hidden lg:block">
                <SectionSubTitle className="font-noora">{page}</SectionSubTitle>
                {kicker && (
                  <div className="font-noora overflow-hidden">{kicker}</div>
                )}
                <SectionTitle className="font-noora" textColor={titleTextColor}>
                  {title}
                </SectionTitle>{" "}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 sm:gap-10">
                {paragraphs.map((p, i) => (
                  <Paragraph key={i} textColor={paragraphTextColor}>
                    {p}
                  </Paragraph>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: ctaDelay, ease: EASE }}
              className="mt-12"
            >
              {cta}
            </motion.div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
