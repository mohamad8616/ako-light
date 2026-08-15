/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { homepageSections } from "@/lib/data/homepage";
import HomepageSection from "../ui/HomepageSection";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomeCollectionBanner() {
  const { t } = useLanguage();
  const { homeCollection } = homepageSections;

  return (
    <HomepageSection className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-14">
          {/* Image column, with peeking "next" card underneath it */}
          <div className="relative order-1 lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className="group relative aspect-4/3 w-full overflow-hidden lg:aspect-auto lg:h-full lg:min-h-105"
            >
              <img
                src={homeCollection.image}
                alt={t("homeCollection.title")}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            </motion.div>

          </div>

          {/* Content column — title pinned top, CTA pinned bottom to mirror the image height */}
          <div className="order-2 flex flex-col lg:col-span-5 lg:justify-between lg:py-2">
            <div>
              <div className="overflow-hidden">
                <motion.h2
                  initial={{ y: "100%" }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE }}
                  className="text-4xl font-bold uppercase leading-[0.95] tracking-tight text-background md:text-6xl"
                >
                  {t("homeCollection.title")}
                </motion.h2>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
                className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-background/70 md:text-base"
              >
                {t("homeCollection.description")}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="mt-10 lg:mt-16"
            >
              <Link
                href="https://homecollection.henge07.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:text-background/60"
              >
                <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
                  +
                </span>
                <span className="relative">
                  {t("homeCollection.discover")}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-background transition-[width] duration-300 group-hover:w-full" />
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
