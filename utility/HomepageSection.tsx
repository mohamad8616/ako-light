"use client";
import { motion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared section shell with a two-mode width system:
 *
 *  - default ("fluid"): full viewport width with proportional gutters
 *    (px-6 → md:px-12 → lg:px-20 → xl:px-[8.5vw]). Content grows with the
 *    viewport instead of being capped — at 1440px this is identical to the
 *    old 1600px-capped layout; at 1920px+ the page uses the whole screen.
 *
 *  - `bleed`: edge-to-edge. No gutters at all — for visuals that must touch
 *    the viewport edges (video, banner imagery). Text/CTAs inside a bleed
 *    section need their own gutter wrapper.
 *
 * A hard max-width is never imposed automatically. When content genuinely
 * benefits from a cap (dense link grids, long text columns), the consumer
 * opts in via `className` (e.g. the fullscreen menu's max-w-[1600px]).
 */
const HomepageSection = ({
  children,
  className,
  animateOnLoad = false,
  bleed = false,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  animateOnLoad?: boolean;
  bleed?: boolean;
} & React.ComponentProps<typeof motion.section>) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: "20%" }}
      {...(animateOnLoad
        ? { animate: { opacity: 1, y: 0 } }
        : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } })}
      transition={{ duration: 2, ease: EASE }}
      className={`${className} ${bleed ? "" : "mx-auto w-full px-6 md:px-12 lg:px-20 xl:px-[8.5vw]"}`}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default HomepageSection;

