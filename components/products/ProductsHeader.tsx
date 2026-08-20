"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ProductsHeader() {
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="border-b border-white/15 pb-4"
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            Products
          </span>
        </motion.div>

        <div className="mt-2overflow-hidden pb-16 md:mt-4 md:pb-40">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="text-3xl uppercase leading-[0.95] text-white md:text-6xl"
          >
            Products
          </motion.h1>
        </div>
      </div>
    </header>
  );
}
