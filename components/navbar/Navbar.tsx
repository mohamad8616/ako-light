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
    // const { t } = useLanguage();

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
        <div
          className={`transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            scrolled
              ? "bg-background/90 backdrop-blur-md border-b border-white/5"
              : "bg-transparent"
          }`}
        >
          <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 md:h-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
            {/* Logo */}
            <Link href="/" className="cursor-pointer group">
              <HengeLogo className="w-24 h-auto fill-white transition-all duration-500 group-hover:opacity-70 md:w-28" />
            </Link>

            {/* Right Side — only Search + Menu + products*/}
            <div className="flex items-center gap-6 md:gap-8">
              <button
                aria-label={t("nav.search")}
                className="text-white transition-all duration-300 hover:opacity-70 cursor-pointer"
              >
                <Search size={18} strokeWidth={2.2} />
              </button>
              <span> products </span>
              <button
                onClick={() => setOpen(true)}
                aria-label={t("nav.menu")}
                className="group flex items-center gap-3 text-white transition-all duration-300 hover:opacity-70 cursor-pointer"
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
