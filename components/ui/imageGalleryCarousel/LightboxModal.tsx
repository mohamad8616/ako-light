"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLenis } from "@/lib/lenisStore";
import { cn } from "@/lib/utils";
import { EASE } from "@/utility/HomepageSection";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { MoveRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DRIFT_FACTOR, MAX_ICON_OFFSET } from "./constants";
import type { CarouselItem } from "./types";

// ----- local constants -----

/** Minimum horizontal swipe distance to trigger a navigation. */
const SWIPE_THRESHOLD = 50;

/** Constant vertical offset (px) — arrow sits a little *below* the cursor. */
const ARROW_Y_OFFSET = 28;

/** Stiffer spring than the regular cursor circle so the lightbox arrow
 *  tracks the cursor more tightly. */
const CURSOR_SPRING = { stiffness: 900, damping: 50, mass: 0.2 };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/** Gap between the raw cursor and its lagging spring → clamped icon drift. */
function useDrift(raw: MotionValue<number>, smooth: MotionValue<number>) {
  return useTransform(smooth, (s) =>
    clamp((raw.get() - s) * DRIFT_FACTOR, -MAX_ICON_OFFSET, MAX_ICON_OFFSET),
  );
}

// ----- public types -----

export type LightboxItem = CarouselItem;

type Props = {
  items: LightboxItem[];
  startIndex: number;
  onClose: () => void;
};

// ----- component -----

/**
 * Fullscreen lightbox modal. Renders to `document.body` via a portal so it
 * escapes any ancestor `transform` / `clip` / `will-change` containing block
 * (framer-motion in particular).
 *
 *  • Thumbnail rail on the side (8% on desktop, 80-96px on mobile).
 *  • Large photo on the rest. Click the left half to go previous, right
 *    half to go next (mirrored in RTL via the `dir` attribute).
 *  • Swipe to navigate on touch.
 *  • Cursor-following arrow indicates direction.
 */
export default function LightboxModal({ items, startIndex, onClose }: Props) {
  const { dir, t } = useLanguage();
  const isRtl = dir === "rtl";
  const count = items.length;

  const [current, setCurrent] = useState(() =>
    count ? startIndex % count : 0,
  );
  const [hoverLarge, setHoverLarge] = useState(false);
  const [arrowSide, setArrowSide] = useState<"left" | "right">("left");
  const largeRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const { lock, unlock } = useLenis();

  // Desktop cursor-following arrow — coordinates local to the large area.
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, CURSOR_SPRING);
  const springY = useSpring(cursorY, CURSOR_SPRING);
  const driftX = useDrift(cursorX, springX);
  const driftY = useDrift(cursorY, springY);
  const arrowTop = useTransform(springY, (sy) => sy + ARROW_Y_OFFSET);

  // Scroll lock while the modal is open.
  useEffect(() => {
    lock();
    document.documentElement.classList.add("scroll-locked");
    return () => {
      unlock();
      document.documentElement.classList.remove("scroll-locked");
    };
  }, [lock, unlock]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (count === 0) return null;

  const go = (delta: number) => setCurrent((c) => (c + delta + count) % count);

  const active = items[current];

  /** Cursor position local to the large area + whether it's on the left half. */
  const localXY = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = largeRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    return { x, y: e.clientY - rect.top, isLeftHalf: x < rect.width / 2 };
  };

  const handleLargeMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = localXY(e);
    if (!pos) return;
    // Coordinates are local to the large area — the arrow is absolutely
    // positioned *inside* it, so raw clientX/Y would offset it by the rail.
    cursorX.set(pos.x);
    cursorY.set(pos.y);
    setArrowSide(pos.isLeftHalf ? "left" : "right");
  };

  // Click-to-navigate: left half = previous, right half = next (physical).
  const handleLargeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = localXY(e);
    if (!pos) return;
    go(pos.isLeftHalf ? -1 : 1);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-200 flex bg-black/95"
    >
      {/* Thumbnail rail — 8% on desktop, wider fixed rail on small screens.
          Mirrors with language: left in LTR, right in RTL (flex order). */}
      <aside
        data-lenis-prevent
        className={cn(
          "lightbox-rail flex w-20 shrink-0 flex-col gap-3 overflow-y-auto bg-black/40 p-3 sm:w-24 lg:w-[8%] lg:max-w-55 lg:p-4",
          isRtl ? "border-l" : "border-r",
          "border-white/10",
        )}
      >
        {items.map((item, i) => {
          const isActive = i === current;
          return (
            <button
              key={item.image}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={t("lightbox.photoCount").replace("{current}", String(i + 1)).replace("{total}", String(count))}
              className={cn(
                "relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden transition-opacity duration-300",
                isActive
                  ? "opacity-100 ring-2 ring-white"
                  : "opacity-40 hover:opacity-70",
              )}
            >
              <Image
                src={item.image}
                alt=""
                fill
                sizes="220px"
                className="object-cover"
              />
            </button>
          );
        })}
      </aside>

      {/* Large photo area — flex remainder (~92%). Arrow/click/swipe lives here. */}
      <div
        ref={largeRef}
        onMouseMove={handleLargeMouseMove}
        onMouseEnter={() => setHoverLarge(true)}
        onMouseLeave={() => setHoverLarge(false)}
        onClick={handleLargeClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
      >
        <Image
          key={active.image}
          src={active.image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 92vw"
          className="object-contain"
        />

        {/* Close — stopPropagation so it doesn't trigger half-click nav. */}
        <button
          type="button"
          aria-label={t("nav.close")}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-white/20"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        {/* Cursor-following arrow — desktop only, never over the rail. */}
        <motion.div
          style={{ left: springX, top: arrowTop }}
          animate={{
            scale: hoverLarge ? 1 : 0,
            opacity: hoverLarge ? 1 : 0,
          }}
          transition={{
            opacity: { duration: 0.4, ease: EASE },
            scale: { duration: 0.2, ease: EASE },
          }}
          className="pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block"
        >
          <motion.span
            style={{ x: driftX, y: driftY }}
            animate={{ rotate: arrowSide === "left" ? 180 : 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex items-center justify-center"
          >
            {/* Single right-pointing icon — flips 180° when the cursor is
                on the left half, so it always points where it navigates. */}
            <MoveRight
              size={40}
              strokeWidth={1.25}
              className="text-white mix-blend-difference"
            />
          </motion.span>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
