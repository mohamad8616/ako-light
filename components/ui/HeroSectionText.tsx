"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import HomepageSection, { EASE } from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";
import ScrollIndicator from "../ui/ScrollIndicator";

type HeroSectionTextProps = {
  firstLineKey?: string;
  secondLineKey?: string;
  btnKey?: string;
  firstLine?: string;
  secondLine?: string;
  btn?: string;
};

export default function HeroSectionText({
  firstLineKey,
  secondLineKey,
  btnKey,
  firstLine: firstLineProp,
  secondLine: secondLineProp,
  btn: btnProp,
}: HeroSectionTextProps) {
  const { lang, t } = useLanguage();

  const firstLine = firstLineKey ? t(firstLineKey) : (firstLineProp ?? "");
  const secondLine = secondLineKey ? t(secondLineKey) : (secondLineProp ?? "");
  const btn = btnKey ? t(btnKey) : (btnProp ?? "");

  return (
    <HomepageSection className="absolute inset-x-0 bottom-0 z-10 pb-16 md:pb-20 lg:pb-24">
      <div className="">
        <motion.h1
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
          className={cn(
            "text-4xl leading-[0.95] tracking-tighter text-white uppercase md:text-6xl lg:text-7xl xl:text-7xl",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {firstLine}
        </motion.h1>
      </div>
      <div className="mt-5 overflow-hidden">
        <motion.h2
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
          className={cn(
            "font-din mt-2 text-lg tracking-tight text-white uppercase md:text-2xl lg:text-3xl",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {secondLine}
        </motion.h2>
      </div>
      {btn && <PlusTextBtn text={btn} href="/catalogue" className="mt-5" />}

      {/* Scroll indicator */}
      <ScrollIndicator />
    </HomepageSection>
  );
}
