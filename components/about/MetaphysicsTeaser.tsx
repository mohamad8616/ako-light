"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function MetaphysicsTeaser() {
  return (
    <section className="w-full bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1000px] px-6 text-center md:px-12">
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-6xl"
          >
            The Metaphysics of Beauty
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="mt-6 text-lg font-light text-background-secondary md:text-xl"
        >
          Henge&rsquo;s world is incredibly rich of unique materials
        </motion.p>

        <motion.a
          href="#"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
          className="group mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-white/70 transition-colors duration-300 hover:text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 transition-colors duration-300 group-hover:border-white">
            <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
          </span>
          How Italians Sound: behind our products and beyond the Design industry.
        </motion.a>
      </div>
    </section>
  );
}
