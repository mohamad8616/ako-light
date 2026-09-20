"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";
import HomepageSection, { EASE } from "./HomepageSection";

const PageTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { lang } = useLanguage();

  return (
    <HomepageSection className="lg:mt-60">
      <motion.div className="border-b border-white/15 pb-4">
        <span className="text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
          {children}
        </span>
      </motion.div>
      <div className="mt-2 overflow-hidden pb-16 md:mt-4 md:pb-40">
        <motion.h1
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8, ease: EASE }}
          className={cn(
            "text-background-secondary text-3xl uppercase md:text-5xl",
            lang === "fa"
              ? "font-noora leading-normal"
              : "font-din leading-[0.95] tracking-tight",
            className,
          )}
        >
          {children}
        </motion.h1>
      </div>
    </HomepageSection>
  );
};

export default PageTitle;
