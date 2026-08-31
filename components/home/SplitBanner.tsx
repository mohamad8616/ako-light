"use client";

import { EASE } from "@/utility/HomepageSection";
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
  children?: React.ReactNode;
  page?: string;
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
  children,
}: SplitBannerProps) {
  const imageCol = reverse ? "lg:col-span-7" : "lg:col-span-5";
  const textCol = reverse ? "lg:col-span-5" : "lg:col-span-7";

  return (
    <HomepageSection className={sectionClassName}>
      <div>
        {children}
        <div
          className={`grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 ${stretch ? "lg:items-stretch" : ""}`}
        >
          {/* Mobile only: kicker/subtitle row above the image */}
          <div className="lg:hidden">
            {page && <SectionSubTitle>{page}</SectionSubTitle>}
            {<SectionTitle>{title}</SectionTitle>}
          </div>

          <div className={`relative ${imageCol}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className={`group relative aspect-4/5 h-125.75 max-h-125.75 w-3/4 max-w-3/4 overflow-hidden lg:aspect-3/4 ${imageClassName ?? ""}`}
            >
              <Image
                src={image}
                alt={imageAlt}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
              {badge}
            </motion.div>
          </div>

          <div
            className={`flex flex-col ${reverse ? "order-2 lg:py-2" : "justify-between"} ${textCol}`}
          >
            <div>
              <div className="hidden lg:block">
                <SectionSubTitle>{page}</SectionSubTitle>
                {kicker && <div className="overflow-hidden">{kicker}</div>}
                <SectionTitle>{title}</SectionTitle>{" "}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
                {paragraphs.map((p, i) => (
                  <div key={i}>{p}</div>
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
