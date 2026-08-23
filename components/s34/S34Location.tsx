"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection, { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";

export default function S34Location() {
  const { location } = s34Sections;

  return (
    <section className="bg-background relative w-full overflow-hidden py-24 md:py-36">
      {/* Giant background title */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.span
          initial={{ opacity: 0, scale: 1.1 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
          className="text-background-secondary/6 text-[30vw] leading-none font-light tracking-tighter whitespace-nowrap uppercase select-none md:text-[20vw]"
        >
          S34
        </motion.span>
      </div>

      <HomepageSection className="relative z-10 mx-auto max-w-[1600px] px-6 text-center md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "110%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE }}
            className="text-background-secondary text-5xl tracking-tight uppercase md:text-7xl"
          >
            {location.title}
          </motion.h2>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="text-background-secondary/60 mt-4 text-sm font-light tracking-[0.2em] uppercase"
        >
          {location.address}
        </motion.p>
      </HomepageSection>
    </section>
  );
}
