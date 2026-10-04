"use client";

import CollapsibleNavItem from "@/components/navbar/CollapsibleNavItem";
import FullscreenMenu from "@/components/navbar/fullScreenMenu";
import Logo from "@/components/ui/Logo";
import ProductsSheet from "@/components/ui/ProductsSheet";
import { authClient } from "@/lib/auth/auth-client";
import type { NavCategory } from "@/lib/data/product-categories/types";
import { useHeroVideoStore } from "@/lib/heroVideoStore";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MenuButton from "./MenuBtn";

// NOTE: the fullscreen menu is imported STATICALLY on purpose.
//
// It was briefly loaded with `next/dynamic` to defer its chunk until the menu
// first opens. That was reverted because it bought nothing: this component also
// renders <ProductsSheet>, which imports components/ui/sheet.tsx, which imports
// framer-motion at the top level — so the library is in this chunk either way
// and deferring the menu's own code saves no dependency. All it added was a
// dynamic chunk boundary in the site shell, i.e. risk without reward. Revisit
// only together with removing framer-motion from sheet.tsx (see the review's
// §4.5), at which point the deferral would actually pay off.

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
export default function Navbar({
  categories,
  logoUrl,
}: {
  categories: NavCategory[];
  /**
   * Brand logo resolved from SiteSettings through the Media library
   * (Pass 13.5D). Optional: when it is null the logo falls back to the text
   * wordmark, so the navbar is unchanged on a site with no custom logo.
   */
  logoUrl?: string | null;
}) {
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { t } = useLanguage();
  const router = useRouter();
  const isVideoPlaying = useHeroVideoStore((s) => s.isPlaying);
  const { data: session, isPending } = authClient.useSession();

  const overlayOpen = activeOverlay !== null;
  const menuOpen = activeOverlay === "menu";
  const isAuthenticated = Boolean(session?.session);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    router.refresh();
  }, [router]);

  // The hero video also needs the navbar fully out of the way — named
  // once here instead of repeating `|| isVideoPlaying` at every use site.
  const navHidden = hidden || isVideoPlaying;
  const interactionBlocked = overlayOpen || isVideoPlaying;

  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const toggleMenu = useCallback(
    () => setActiveOverlay((cur) => (cur === "menu" ? null : "menu")),
    [],
  );

  // Scroll tracking, without framer-motion.
  //
  // This used to be `useScroll()` + `useMotionValueEvent()`, which mattered
  // because the Navbar is rendered by the (site) layout: importing the library
  // here put it on the critical path of every public page, for what is really
  // "compare current scrollY with the previous one". A passive window listener
  // does the same thing; the previous offset lives in a ref because it must
  // survive between events without re-rendering.
  const previousScrollRef = useRef(0);

  useEffect(() => {
    // Start from wherever the page actually is (a restored scroll position or a
    // back-navigation) so the very first scroll event compares like with like
    // instead of against 0.
    previousScrollRef.current = window.scrollY;

    const handleScroll = () => {
      const latest = window.scrollY;
      const prev = previousScrollRef.current;
      previousScrollRef.current = latest;

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
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  // a fixed child escapes a transformed ancestor whenever the transform is
  // `none` (at rest, y: 0), which desynced the bar from the slide and made
  // the reveal appear without animation. As a normal child, the whole bar
  // slides as one unit — in from the top, out through the top, like a
  // shadcn top sheet. Colors/width snap instantly (no transition classes);
  // only height animates, which is what carries the text/nav items up/down
  // between the two styles.

  return (
    <>
      <header
        className={headerClass}
        style={{
          transform: navHidden ? "translateY(-100%)" : "translateY(0)",
          transition: `transform ${HEADER_TRANSITION}s cubic-bezier(${HEADER_EASE.join(",")})`,
          willChange: "transform",
        }}
      >
        {/* The bar itself. A plain (non-fixed) child of the sliding
            header: entering from above, exiting upward — sheet-style. */}
        <div
          className={cn(
            "flex items-center justify-between border-b transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isScrolledStyle
              ? "mx-auto h-24 border-white/10 bg-black px-6 sm:w-11/12 sm:px-4 xl:px-16"
              : "h-24 w-full border-transparent bg-transparent px-6 md:px-12 lg:h-68 lg:px-20 xl:px-[8.5vw]",
          )}
        >
          {/* Logo — also closes any open overlay when clicked. */}
          <Link
            href="/"
            onClick={closeOverlay}
            className={`group cursor-pointer ${overlayOpen ? "pointer-events-auto" : ""}`}
          >
            <Logo
              src={logoUrl}
              className="z-999 h-auto max-h-10 w-auto object-contain fill-white transition-all duration-500 group-hover:opacity-70"
            />
          </Link>

          {/* Right-side action cluster. */}
          <div className="flex items-center gap-6 md:gap-12">
            <CollapsibleNavItem hidden={overlayOpen}>
              <Link
                href="/search"
                aria-label={t("nav.search")}
                className="text-background-secondary cursor-pointer transition-all duration-300 hover:opacity-70"
              >
                <Search size={18} strokeWidth={2.2} />
              </Link>
            </CollapsibleNavItem>

            {!isPending && (
              <CollapsibleNavItem hidden={overlayOpen}>
                {isAuthenticated ? (
                  <>
                    {/* Order history is per-account, so it only appears to a
                        signed-in visitor. */}
                    <Link
                      href="/orders"
                      className="text-background-secondary cursor-pointer text-sm font-medium transition-all duration-300 hover:opacity-70"
                    >
                      {t("orders.title")}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-background-secondary cursor-pointer text-sm font-medium transition-all duration-300 hover:opacity-70"
                    >
                      {t("auth.nav.signOut")}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/sign-in"
                    className="text-background-secondary cursor-pointer text-sm font-medium transition-all duration-300 hover:opacity-70"
                  >
                    {t("auth.nav.signIn")}
                  </Link>
                )}
              </CollapsibleNavItem>
            )}

            <CollapsibleNavItem
              hidden={activeOverlay === "menu"}
              className={overlayOpen ? "pointer-events-auto" : undefined}
            >
              <ProductsSheet
                open={activeOverlay === "products"}
                onOpenChange={(o) => setActiveOverlay(o ? "products" : null)}
                categories={categories}
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
      </header>

      <FullscreenMenu open={menuOpen} onClose={closeOverlay} />
    </>
  );
}
