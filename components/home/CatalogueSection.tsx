/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import HomepageSection from "../ui/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CatalogueSection() {
  const { catalogue } = homepageSections;
  const { t } = useLanguage();

  return (
    <HomepageSection className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Text column */}
          <div className="order-2 flex flex-col justify-start lg:order-1 lg:col-span-6">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="block text-xs font-medium uppercase tracking-[0.25em] text-background/50"
            >
              HENGE CATALOGUE
            </motion.span>

            <div className="mt-3 overflow-hidden mb-5">
              <SectionTitle>S34/5</SectionTitle>
            </div>

            <Paragraph>{t("catalogue.description")}</Paragraph>
          </div>

          {/* Image column — small, portrait, matches the reference photo's proportions */}
          <div className="order-1 lg:order-2 lg:col-span-6 lg:flex lg:justify-end">
            <div className="w-full max-w-95">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className="group relative aspect-2/3 w-full overflow-hidden"
              >
                <img
                  src={catalogue.image}
                  alt="S34/5"
                  className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />

                {/* Animated download circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
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
              </motion.div>

              {/* CTA — flush with the image's left edge, same as the reference */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                className="mt-8 "
              >
                <PlusTextBtn text=" Download S34/5" textColor="text-background" href="#"/>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
