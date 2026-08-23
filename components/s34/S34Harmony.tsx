"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

export default function S34Harmony() {
  const { harmony } = s34Sections;

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10 mx-auto max-w-[1600px] border-t px-6 pt-16 md:px-12 md:pt-24 lg:px-20 xl:px-[8.5vw]">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/3">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-background text-2xl leading-[0.95] tracking-wide uppercase md:text-4xl"
          >
            {harmony.kicker}
          </motion.h2>
        </div>

        {/* Two-column paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-2 md:gap-10">
          {harmony.paragraphs.map((p, i) => (
            <Paragraph key={i}>{p}</Paragraph>
          ))}
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
          className="mt-14 flex flex-wrap gap-x-10 gap-y-6"
        >
          <PlusTextBtn
            href="/products"
            text="Products"
            textColor="text-background"
          />
          <PlusTextBtn
            href="/projects"
            text="Projects"
            textColor="text-background"
          />
          <PlusTextBtn href="/s34" text="S34" textColor="text-background" />
        </motion.div>
      </div>
    </HomepageSection>
  );
}
