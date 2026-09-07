"use client";

import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Play } from "lucide-react";
import { EASE } from "../../../utility/HomepageSection";

// Radius (px) the Play icon may drift from the circle center toward the
// cursor, clamped so the icon stays inside the h-28 w-28 (112px) host.
const MAX_ICON_OFFSET = 34;
// How much of the spring-vs-cursor gap we translate into icon drift. 1 would
// pin the icon exactly under the cursor; lower values keep it glued closer to
// center with a visible bias toward the cursor.
const DRIFT_FACTOR = 0.45;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function PlayCircle({
  mouseX,
  mouseY,
  visible,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  visible: boolean;
}) {
  // Smoothed cursor position — the circle trails the cursor (spring lag).
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30, mass: 0.5 });

  // Gap between the mouse and the lagging circle → icon drift, recomputed per
  // animation frame so it stays smooth even while the cursor sits still.
  // (springX changes every frame while animating, so the transformer — and the
  // leading mouseX.get() read — stays in sync with the motion loop.)
  const iconX = useTransform(springX, (sx) =>
    clamp(
      (mouseX.get() - sx) * DRIFT_FACTOR,
      -MAX_ICON_OFFSET,
      MAX_ICON_OFFSET,
    ),
  );
  const iconY = useTransform(springY, (sy) =>
    clamp(
      (mouseY.get() - sy) * DRIFT_FACTOR,
      -MAX_ICON_OFFSET,
      MAX_ICON_OFFSET,
    ),
  );

  return (
    <motion.div
      style={{ left: springX, top: springY }}
      animate={{
        scale: visible ? 1 : 0,
        opacity: visible ? 0.6 : 0,
      }}
      transition={{ duration: 0.4, ease: EASE }}
      className="pointer-events-none absolute z-20 hidden h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white md:flex"
    >
      <motion.span
        style={{ x: iconX, y: iconY }}
        className="flex items-center justify-center"
      >
        <Play size={32} className="ml-1 fill-black text-black" />
      </motion.span>
    </motion.div>
  );
}
