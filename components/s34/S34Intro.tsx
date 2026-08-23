"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";

export default function S34Intro() {
  const { intro } = s34Sections;

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Kicker */}
        <div className="overflow-hidden lg:w-2/3">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-background text-xl leading-[1.1] font-light tracking-wide uppercase md:text-3xl"
          >
            {intro.kicker}
          </motion.h2>
        </div>

        {/* Two-column paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {intro.paragraphs.map((p, i) => (
            <Paragraph key={i}>{p}</Paragraph>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
