"use client";

import { motion } from "framer-motion";
import { EASE } from "../../utility/HomepageSection";

export default function S34Hero() {
  return (
    <section className="bg-background relative flex h-screen w-full items-center justify-center overflow-hidden">
      {/* Giant background title */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.span
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
          className="text-background-secondary/8 text-[38vw] leading-none font-light tracking-tighter whitespace-nowrap uppercase select-none md:text-[26vw]"
        >
          S34
        </motion.span>
      </div>

      {/* Centered copy */}
      <div className="relative z-10 px-6 text-center md:px-12">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="text-background-secondary text-6xl tracking-tight uppercase md:text-8xl"
          >
            S-34
          </motion.h1>
        </div>
        <div className="mt-4 overflow-hidden">
          <motion.p
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
            className="text-background-secondary/60 text-sm font-light tracking-[0.25em] uppercase md:text-base"
          >
            Experience the beauty of timeless design
          </motion.p>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t to-transparent" />
    </section>
  );
}
