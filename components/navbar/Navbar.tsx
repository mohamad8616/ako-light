"use client";

import CollapsibleNavItem from "@/components/navbar/CollapsibleNavItem";
import FullscreenMenu from "@/components/navbar/fullScreenMenu";
import AkoLightingLogo from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import ProductsSheet from "../ui/ProductsSheet";

type ActiveOverlay = "products" | "menu" | null;

export default function Navbar() {
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();
  const { scrollY } = useScroll();

  const overlayOpen = activeOverlay !== null;
  const menuOpen = activeOverlay === "menu";

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const isScrollingDown = latest > prev;
    const atTop = latest < 90;

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
        className={`fixed inset-x-0 top-0 ${menuOpen ? "z-[1000]" : "z-50"} ${overlayOpen ? "pointer-events-none" : ""}`}
      >
        {/* Both states now declare an explicit height (h-20/h-24 vs h-40/h-52)
            instead of one state relying on "auto", and the transitioned
            properties are listed explicitly so "height" is actually included —
            Tailwind's plain `transition` class does NOT animate height by
            default, only color/opacity/shadow/transform/filter. */}

        <div
          className={`flex border-b transition-[height,width,background-color,backdrop-filter,border-color,border-radius] duration-1500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            scrolled && !overlayOpen
              ? "mx-auto h-24 w-full items-center border-white/10 md:h-22"
              : "backdrop-blur-0 mx-auto h-32 w-full items-end border-transparent md:h-52"
          }`}
        >
          <div
            className={`mx-auto flex h-full w-full items-center justify-between px-6 md:px-12 lg:px-20 xl:px-[8.5vw] ${scrolled && !overlayOpen ? "bg-background" : "bg-transparent"}`}
          >
            {/* Logo */}
            <Link
              href="/"
              className={`group cursor-pointer ${overlayOpen ? "pointer-events-auto" : ""}`}
            >
              <AkoLightingLogo className="h-auto w-24 fill-white transition-all duration-500 group-hover:opacity-70 md:w-28" />
            </Link>

            {/* Right Side — only Search + Menu + products*/}
            <div className="flex items-center gap-6 md:gap-12">
              <CollapsibleNavItem hidden={overlayOpen}>
                <button
                  aria-label={t("nav.search")}
                  className="text-background-secondary cursor-pointer transition-all duration-300 hover:opacity-70"
                >
                  <Search size={18} strokeWidth={2.2} />
                </button>
              </CollapsibleNavItem>
              {/* <Button className="text-xs font-din tracking-tighter"> PRODUCTS </Button> */}
              <CollapsibleNavItem
                hidden={activeOverlay === "menu"}
                className={overlayOpen ? "pointer-events-auto" : undefined}
              >
                <ProductsSheet
                  open={activeOverlay === "products"}
                  onOpenChange={(o) => setActiveOverlay(o ? "products" : null)}
                />
              </CollapsibleNavItem>
              <CollapsibleNavItem
                hidden={activeOverlay === "products"}
                className={overlayOpen ? "pointer-events-auto" : undefined}
              >
                <button
                  onClick={() =>
                    setActiveOverlay((cur) => (cur === "menu" ? null : "menu"))
                  }
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? t("nav.close") : t("nav.menu")}
                  className="group relative flex h-[18px] w-[18px] cursor-pointer items-center justify-center text-white transition-all duration-300 hover:opacity-70"
                >
                  <span
                    className={`absolute transition-[opacity,transform] duration-300 ease-in-out ${
                      menuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                    }`}
                  >
                    <Menu size={18} strokeWidth={2.5} />
                  </span>
                  <span
                    className={`absolute transition-[opacity,transform] duration-300 ease-in-out ${
                      menuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                    }`}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </span>
                </button>
              </CollapsibleNavItem>
            </div>
          </div>
        </div>
      </motion.header>

      <FullscreenMenu open={menuOpen} onClose={() => setActiveOverlay(null)} />
    </>
  );
}
