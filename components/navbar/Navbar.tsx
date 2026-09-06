"use client";

import CollapsibleNavItem from "@/components/navbar/CollapsibleNavItem";
import FullscreenMenu from "@/components/navbar/fullScreenMenu";
import Logo from "@/components/ui/Logo";
import ProductsSheet from "@/components/ui/ProductsSheet";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

// ----- constants -----

/** Navbar geometry. Sizes match the two "scrolled" / "at top" states. */
const SCROLL_HIDE_THRESHOLD = 120; // px — start hiding once user scrolls past this
const SCROLLED_CLASS_THRESHOLD = 90; // px — start the "scrolled" border/background after this

/** Easing curve used for the header slide-in/out. Matches the rest of the site. */
const HEADER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Duration of the header show/hide transition (seconds). */
const HEADER_TRANSITION = 0.5;

type ActiveOverlay = "products" | "menu" | null;

/**
 * Site-wide top navigation.
 *
 * Manages three states:
 *  1. **Closed** — shows logo, search, products, menu buttons.
 *  2. **Products sheet open** — full-width product sheet overlay.
 *  3. **Menu open** — fullscreen navigation overlay.
 *
 * Also auto-hides on scroll-down (past `SCROLL_HIDE_THRESHOLD`) and shows
 * on scroll-up — a common "sticky" pattern that keeps content room
 * available while reading.
 */
export default function Navbar() {
  // Which fullscreen overlay is open (only one at a time).
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  // `true` when the header should slide out of view (scroll-down, past threshold).
  const [hidden, setHidden] = useState(false);
  // `true` once the user has scrolled away from the very top of the page.
  const [scrolled, setScrolled] = useState(false);

  const { t } = useLanguage();
  const { scrollY } = useScroll();

  // Derived booleans — cheaper than re-deriving inside JSX.
  const overlayOpen = activeOverlay !== null;
  const menuOpen = activeOverlay === "menu";

  // Stable callbacks so children don't re-render unnecessarily.
  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const openMenu = useCallback(
    () => setActiveOverlay((cur) => (cur === "menu" ? null : "menu")),
    [],
  );

  // useMotionValueEvent runs outside the React render cycle and writes
  // directly to the MotionValue, so subscribing to `scrollY` doesn't
  // cause a re-render on every scroll frame — only `setState` does, and
  // we only set when the boolean actually flips.
  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const isScrollingDown = latest > prev;
    const atTop = latest < SCROLLED_CLASS_THRESHOLD;

    const nextHidden = isScrollingDown && latest > SCROLL_HIDE_THRESHOLD;
    setHidden((cur) => (cur === nextHidden ? cur : nextHidden));
    setScrolled((cur) => (cur === !atTop ? cur : !atTop));
  });

  // Header class — assembled once per render but only when state changes.
  // When scrolled, the header gets a top margin so the floating bar
  // has breathing room above; horizontal spacing is handled by the bar
  // itself.
  const headerClass = useMemo(
    () =>
      [
        "fixed inset-x-0 top-0",

        menuOpen ? "z-1000" : "z-50",
        overlayOpen ? "pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [overlayOpen, menuOpen],
  );

  // Inner bar classes. Both states declare the *same* properties
  // (height, width, vertical alignment, margin) so the `transition-[...]`
  // list below can interpolate every value smoothly.
  //
  //   • At top → `w-full` + `items-end` (logo + buttons anchored to bottom).
  //   • Scrolled → `w-[calc(100vw-8.5vw)]` + `items-center` (compact, floating).
  const barClass = useMemo(() => {
    const alignment = scrolled && !overlayOpen ? "items-center" : "items-end";
    const height = scrolled && !overlayOpen ? "h-24 md:h-22" : "h-32 md:h-52";
    const width = scrolled && !overlayOpen ? "w-[calc(100vw-9vw)]" : "w-full";
    return `mx-auto flex ${height} ${width} ${alignment} border-transparent`;
  }, [scrolled, overlayOpen]);

  // Inner row — always carries the page-edge padding so the bar's
  // padding never appears/disappears on the wrong element during the
  // morph. The BG swaps between transparent (top) and solid (scrolled).
  const barInnerClass = useMemo(() => {
    const bg =
      scrolled && !overlayOpen
        ? "bg-background px-14"
        : "bg-transparent px-6 md:px-12 lg:px-20 xl:px-[8.5vw] ";
    return `flex h-full w-full items-center justify-between ${bg}`;
  }, [scrolled, overlayOpen]);

  // Animated transition for the bar/inner. Listing every property that
  // changes in either state (height, width, padding, BG; `items-*` doesn't
  // animate so it's not in the list) means Tailwind interpolates the
  // whole thing. The class name is hardcoded so Tailwind's JIT scanner
  // picks it up.
  const barTransitionClass =
    "flex transition-[height,width,padding,margin,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <>
      {/* Animated header (slides up on scroll-down). */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={{ duration: HEADER_TRANSITION, ease: HEADER_EASE }}
        className={headerClass}
      >
        <div className={`${barTransitionClass} ${barClass}`}>
          <div className={barInnerClass}>
            {/* Logo — also closes any open overlay when clicked. */}
            <Link
              href="/"
              onClick={closeOverlay}
              className={`group cursor-pointer ${overlayOpen ? "pointer-events-auto" : ""}`}
            >
              <Logo className="z-999 h-auto fill-white transition-all duration-500 group-hover:opacity-70" />
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
                  onClick={openMenu}
                  closeLabel={t("nav.close")}
                  openLabel={t("nav.menu")}
                />
              </CollapsibleNavItem>
            </div>
          </div>
        </div>
      </motion.header>

      <FullscreenMenu open={menuOpen} onClose={closeOverlay} />
    </>
  );
}

// ----- menu trigger button (kept local — only Navbar uses it) -----

function MenuButton({
  menuOpen,
  onClick,
  openLabel,
  closeLabel,
}: {
  menuOpen: boolean;
  onClick: () => void;
  openLabel: string;
  closeLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={menuOpen}
      aria-label={menuOpen ? closeLabel : openLabel}
      className="group relative flex h-4.5 w-4.5 cursor-pointer items-center justify-center text-white transition-all duration-300 hover:opacity-70"
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
  );
}
