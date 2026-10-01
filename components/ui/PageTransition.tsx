"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Route-change fade curtain.
 *
 * Previously the page content itself was keyed by pathname, which remounted
 * the entire subtree on every navigation (lost client state, re-ran effects,
 * restarted videos). Now `{children}` renders untouched and only a cheap,
 * non-interactive overlay animates — same fade feel, no remount cost.
 *
 * The overlay used to be a framer-motion `motion.div`. Because this component
 * is rendered by the (site) layout, that put the animation library on the
 * critical path of every public page for a single opacity fade. It is now a
 * CSS keyframe (`page-curtain` in app/globals.css); `key={pathname}` remounts
 * the element on navigation, which restarts the animation exactly as the
 * motion component's `initial`/`animate` pair did.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1">
      {children}
      <div
        key={pathname}
        aria-hidden
        className="page-curtain bg-background pointer-events-none fixed inset-0 z-200"
      />
    </div>
  );
}
