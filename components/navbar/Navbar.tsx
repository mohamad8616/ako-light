"use client";

import CollapsibleNavItem from "@/components/navbar/CollapsibleNavItem";
import FullscreenMenu from "@/components/navbar/fullScreenMenu";
import Logo from "@/components/ui/Logo";
import ProductsSheet from "@/components/ui/ProductsSheet";
import { useHeroVideoStore } from "@/lib/heroVideoStore";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import MenuButton from "./MenuBtn";

// ----- constants -----

/**
 * Scroll distance (px) past the top that drives both the hide-on-scroll-
 * down and the scrolled style switch (background/border/width). Hiding
 * and styling are intentionally gated on scroll *direction* — see the
 * scroll handler below — so a downward scroll from the top slides the
 * bar away in its transparent style without ever flashing the scrolled
 * style first.
 */
const SCROLLED_CLASS_THRESHOLD = 90; // px

/** Easing curve for the header slide-in/out. */
const HEADER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Duration of the header show/hide transition (seconds). */
const HEADER_TRANSITION = 0.5;

type ActiveOverlay = "products" | "menu" | null;

/**
 * Site-wide top navigation.
 *
 * States:
 *  1. Closed — logo, search, products, menu.
 *  2. Products sheet open.
 *  3. Fullscreen menu open.
 *  4. Hero video playing — navbar hides entirely so it doesn't sit over
 *     (and swallow clicks on) the video's own close button.
 *
 * Scroll behavior: scrolling DOWN past `SCROLLED_CLASS_THRESHOLD` simply
 * hides the bar in whatever style it currently has — the scrolled style
 * is never applied mid-hide, so there is no style flash. Scrolling up
 * reveals the bar directly in its scrolled style; only once back under
 * the threshold does it return to the transparent "at top" style.
 * Height and internal alignment are constant across both states — only
 * background/border/width change — so the logo and nav buttons never
 * move vertically.
 */
export default function Navbar() {
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const isVideoPlaying = useHeroVideoStore((s) => s.isPlaying);

  const overlayOpen = activeOverlay !== null;
  const menuOpen = activeOverlay === "menu";

  // The hero video also needs the navbar fully out of the way — named
  // once here instead of repeating `|| isVideoPlaying` at every use site.
  const navHidden = hidden || isVideoPlaying;
  const interactionBlocked = overlayOpen || isVideoPlaying;

  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const toggleMenu = useCallback(
    () => setActiveOverlay((cur) => (cur === "menu" ? null : "menu")),
    [],
  );

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const isScrollingDown = latest > prev;

    // Scrolling DOWN past the threshold: hide only. `scrolled` is
    // deliberately NOT flipped here, so the bar slides away in the style
    // it already has (the transparent top style) — switching the style
    // and hiding in the same frame is what read as a black flash.
    const nextHidden = isScrollingDown && latest > SCROLLED_CLASS_THRESHOLD;
    setHidden((cur) => (cur === nextHidden ? cur : nextHidden));

    // The scrolled style only ever applies to a *visible* bar — i.e. one
    // revealed by scrolling up while below the top threshold. While
    // hidden and scrolling down it stays false (no wasted style churn),
    // and on the way back up the bar reappears already in the scrolled
    // style instead of morphing mid-reveal.
    const nextScrolled = !isScrollingDown && latest >= SCROLLED_CLASS_THRESHOLD;
    setScrolled((cur) => (cur === nextScrolled ? cur : nextScrolled));
  });

  const headerClass = useMemo(
    () =>
      [
        "fixed inset-x-0 top-0",
        menuOpen ? "z-1000" : "z-50",
        interactionBlocked ? "pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [menuOpen, interactionBlocked],
  );

  const isScrolledStyle = scrolled && !overlayOpen;

  // The bar is a normal child of the sliding header (NOT position:fixed):
  // a fixed child escapes a transformed ancestor whenever framer-motion
  // resolves the transform to `none` (at rest, y: 0), which desynced the
  // bar from the slide and made the reveal appear without animation.
  // As a normal child, the whole bar slides as one unit — in from the
  // top, out through the top, like a shadcn top sheet. Colors/width snap
  // instantly (no transition classes); only height animates, which is
  // what carries the text/nav items up/down between the two styles.

  return (
    <>
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: navHidden ? "-100%" : 0 }}
        transition={{ duration: HEADER_TRANSITION, ease: HEADER_EASE }}
        className={headerClass}
      >
        {/* The bar itself. A plain (non-fixed) child of the sliding
            header: entering from above, exiting upward — sheet-style. */}
        <div
          className={cn(
            "flex items-center justify-between border-b transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isScrolledStyle
              ? "mx-auto h-24 sm:w-11/12 px-6 sm:px-4 border-white/10 bg-black xl:px-16 "
              : "lg:h-68 h-24 w-full border-transparent bg-transparent px-6 md:px-12 lg:px-20 xl:px-[8.5vw]",
          )}
        >
          {/* Logo — also closes any open overlay when clicked. */}
          <Link
            href="/"
            onClick={closeOverlay}
            className={`group cursor-pointer ${overlayOpen ? "pointer-events-auto" : ""}`}
          >
            <Logo className="z-999 h-auto  fill-white transition-all duration-500 group-hover:opacity-70" />
          </Link>

          {/* Right-side action cluster. */}
          <div className="flex items-center gap-6 md:gap-12">
            <CollapsibleNavItem hidden={overlayOpen}>
              <button
                aria-label={t("nav.search")}
                className="text-background-secondary cursor-pointer transition-all duration-300 hover:opacity-70"
              >
                <Search size={18} strokeWidth={2.2} />
              </button>
            </CollapsibleNavItem>

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
              <MenuButton
                menuOpen={menuOpen}
                onClick={toggleMenu}
                openLabel={t("nav.menu")}
                closeLabel={t("nav.close")}
              />
            </CollapsibleNavItem>
          </div>
        </div>
      </motion.header>

      <FullscreenMenu open={menuOpen} onClose={closeOverlay} />
    </>
  );
}
