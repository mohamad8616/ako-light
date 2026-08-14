"use client";

import FullscreenMenu from "@/components/header/fullScreenMenu";
import HengeLogo from "@/components/ui/HengeLogo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const isScrollingDown = latest > prev;
    const atTop = latest < 50;

    // Hide navbar when scrolling down (past 120px), show when scrolling up
    setHidden(isScrollingDown && latest > 120);
    setScrolled(!atTop);
  });

  return (
    <>
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed inset-x-0 top-0 z-50"
      >
        {/* Both states now declare an explicit height (h-20/h-24 vs h-40/h-52)
            instead of one state relying on "auto", and the transitioned
            properties are listed explicitly so "height" is actually included —
            Tailwind's plain `transition` class does NOT animate height by
            default, only color/opacity/shadow/transform/filter. */}
        <div
          className={`mx-auto flex w-11/12 items-end transition-[height,background-color,backdrop-filter,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            scrolled
              ? "h-20 border-b border-white/5 bg-background/90 backdrop-blur-md md:h-24"
              : "h-32 border-b border-transparent bg-transparent backdrop-blur-0 md:h-52"
          }`}
        >
          <div className="mx-auto flex h-20 w-full items-center justify-between px-6 md:h-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
            {/* Logo */}
            <Link href="/" className="group cursor-pointer">
              <HengeLogo className="h-auto w-24 fill-white transition-all duration-500 group-hover:opacity-70 md:w-28" />
            </Link>

            {/* Right Side — only Search + Menu + products*/}
            <div className="flex items-center gap-6 md:gap-8">
              <button
                aria-label={t("nav.search")}
                className="cursor-pointer text-white transition-all duration-300 hover:opacity-70"
              >
                <Search size={18} strokeWidth={2.2} />
              </button>
              <span> products </span>
              <button
                onClick={() => setOpen(true)}
                aria-label={t("nav.menu")}
                className="group flex cursor-pointer items-center gap-3 text-white transition-all duration-300 hover:opacity-70"
              >
                <Menu size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <FullscreenMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
