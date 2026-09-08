"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Route-change fade curtain.
 *
 * Previously the page content itself was keyed by pathname, which remounted
 * the entire subtree on every navigation (lost client state, re-ran effects,
 * restarted videos). Now `{children}` renders untouched and only a cheap,
 * non-interactive overlay animates — same fade feel, no remount cost.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1">
      {children}
      <motion.div
        key={pathname}
        aria-hidden
        className="bg-background pointer-events-none fixed inset-0 z-200"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
