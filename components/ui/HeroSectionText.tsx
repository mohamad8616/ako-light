"use client";

import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import ScrollIndicator from "../ui/ScrollIndicator";

export default function HeroSectionText({
  firstLine,
  secondLine,
  btn,
}: {
  firstLine: string;
  secondLine?: string;
  btn?: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10">
      <div className="mx-auto max-w-[1600px] px-6 pb-16 md:px-12 md:pb-20 lg:px-20 lg:pb-24 xl:px-[8.5vw]">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            className="font-din text-4xl leading-[0.95] tracking-tighter text-white uppercase md:text-6xl lg:text-7xl xl:text-7xl"
          >
            {firstLine}
          </motion.h1>
        </div>
        <div className="mt-5 overflow-hidden">
          <motion.h2
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
            className="font-din mt-2 text-lg tracking-tight text-white uppercase md:text-2xl lg:text-3xl"
          >
            {secondLine}
          </motion.h2>
        </div>
        {btn && <PlusTextBtn text={btn} href="/catalogue" className="mt-5" />}

        {/* Scroll indicator */}
        <ScrollIndicator />
      </div>
    </div>
  );
}
