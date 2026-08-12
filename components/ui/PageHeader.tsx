"use client";

import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="relative w-full bg-background pt-32 md:pt-40">
      <div className="mx-auto max-w-[1600px] px-6 pb-20 md:px-12 md:pb-28 lg:px-20 xl:px-[8.5vw]">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl font-light uppercase tracking-tight text-white md:text-8xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/60 md:text-lg"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </header>
  );
}