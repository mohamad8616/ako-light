"use client";

import { cn } from "@/lib/utils";
import { EASE as MOTION_EASE } from "@/utility/HomepageSection";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DRIFT_FACTOR, MAX_ICON_OFFSET } from "./constants";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type Props = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  visible: boolean;
  isRtl: boolean;
};

/**
 * Renders to `document.body` via a portal so it escapes any ancestor
 * `transform` / `filter` / `will-change` containing block. Without the
 * portal, a `position: fixed` cursor nested inside framer-motion's
 * `motion.section` would be positioned relative to the section (not
 * the viewport) and clipped to it.
 *
 * The circle trails the cursor on a spring and the inner arrow drifts
 * toward the cursor (clamped) — re-centering as the circle catches up.
 */
export default function CursorCircle({ x, y, visible, isRtl }: Props) {
  // SSR-safe mount check.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Smoothed cursor position — circle trails the cursor (spring lag).
  const springX = useSpring(x, { stiffness: 300, damping: 30, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 30, mass: 0.5 });

  // Gap between the mouse and the lagging circle → arrow drift, recomputed
  // per animation frame.
  const arrowX = useTransform(springX, (sx) =>
    clamp((x.get() - sx) * DRIFT_FACTOR, -MAX_ICON_OFFSET, MAX_ICON_OFFSET),
  );
  const arrowY = useTransform(springY, (sy) =>
    clamp((y.get() - sy) * DRIFT_FACTOR, -MAX_ICON_OFFSET, MAX_ICON_OFFSET),
  );

  if (!isClient) return null;

  return createPortal(
    <motion.div
      style={{ left: springX, top: springY }}
      animate={{
        scale: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
      }}
      transition={{
        opacity: { duration: 0.8, ease: MOTION_EASE },
        scale: { duration: 0.4, ease: MOTION_EASE },
      }}
      className="pointer-events-none fixed z-50 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white mix-blend-difference md:flex"
    >
      {/* Arrow pointing top-right (top-left in RTL), drifting toward cursor. */}
      <motion.svg
        style={{ x: arrowX, y: arrowY }}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("text-white mix-blend-difference", isRtl && "rotate-180")}
      >
        <path d="M7 7h10v10" />
        <path d="M7 17L17 7" />
      </motion.svg>
    </motion.div>,
    document.body,
  );
}
