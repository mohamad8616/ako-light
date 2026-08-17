"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DesignersHeader() {
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Kicker + divider */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="border-b border-white/15 pb-4"
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            Designers
          </span>
        </motion.div>

        {/* Big title */}
        <div className="mt-4 overflow-hidden pb-16 md:mt-5 md:pb-24">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="text-3xl uppercase leading-[0.95] tracking-tight text-white md:text-4xl"
          >
            Designers
          </motion.h1>
        </div>
      </div>
    </header>
  );
}
