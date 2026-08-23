"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";

export default function S34Approach() {
  const { approach, journey, materials } = s34Sections;

  return (
    <HomepageSection className="bg-background-secondary w-full">
      <div className="border-background/10 mx-auto max-w-[1600px] space-y-24 border-t px-6 py-20 md:space-y-32 md:px-12 md:py-28 lg:px-20 xl:px-[8.5vw]">
        {/* Approach */}
        <div>
          <div className="overflow-hidden lg:w-2/3">
            <motion.h2
              initial={{ y: "100%" }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className="text-background text-xl leading-[1.1] font-light tracking-wide uppercase md:text-3xl"
            >
              {approach.kicker}
            </motion.h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            {approach.paragraphs.map((p, i) => (
              <Paragraph key={i}>{p}</Paragraph>
            ))}
          </div>
        </div>

        {/* Journey */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5" />
          <div className="space-y-6 lg:col-span-7">
            {journey.paragraphs.map((p, i) => (
              <Paragraph key={i}>{p}</Paragraph>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div>
          <div className="overflow-hidden lg:w-2/3">
            <motion.h2
              initial={{ y: "100%" }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className="text-background text-xl leading-[1.1] font-light tracking-wide uppercase md:text-3xl"
            >
              {materials.kicker}
            </motion.h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            {materials.paragraphs.map((p, i) => (
              <Paragraph key={i}>{p}</Paragraph>
            ))}
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
