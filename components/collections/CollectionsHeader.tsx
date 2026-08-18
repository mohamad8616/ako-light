"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CollectionsHeader() {
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <div className="mx-auto max-w-[1600px] px-6 pb-14 md:px-12 md:pb-20 lg:px-20 xl:px-[8.5vw]">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-5xl font-light uppercase leading-[0.95] tracking-tight text-white md:text-8xl"
          >
            Collections
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mt-4 text-base font-light text-background-secondary md:text-lg"
        >
          Explore our curated collections
        </motion.p>
      </div>
    </header>
  );
}
