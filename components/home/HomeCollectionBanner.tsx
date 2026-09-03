/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { motion } from "framer-motion";
import HomepageSection, { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import Image from "next/image";


export default function HomeCollectionBanner() {
  const { t } = useLanguage();
  const { homeCollection } = homepageSections;

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-14">
          {/* Image column, with peeking "next" card underneath it */}
          <div className="relative order-1 lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              className="group relative  aspect-video w-full overflow-hidden lg:aspect-auto lg:h-full lg:min-h-105"
            >
              <Image
                sizes="(max-width: 1024px) 100vw, 58vw"
                fill
                src={homeCollection.image}
                alt={t("homeCollection.title")}
                className="h absolute object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            </motion.div>
          </div>

          {/* Content column — title pinned top, CTA pinned bottom to mirror the image height */}
          <div className="order-2 flex flex-col lg:col-span-5 lg:justify-between lg:py-2">
            <div>
              <div className="mb-5">
                <SectionTitle>{t("homeCollection.title")}</SectionTitle>
              </div>

              <Paragraph className="font-noora">{t("homeCollection.description")}</Paragraph>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="mt-10 lg:mt-16"
            >
              <PlusTextBtn
                href="/collection"
                text={t("homeCollection.discover")}
                textColor="text-background"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
