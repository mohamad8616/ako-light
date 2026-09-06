"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import CursorCircle from "./CursorCircle";
import { isCategoryItem, toCarouselItems } from "./helpers";
import { useInView, useIsLg, useIsTouch } from "./hooks";
import LightboxModal from "./LightboxModal";
import MobileColumn from "./MobileColumn";
import Slide from "./Slide";
import type { ImageGalleryCarouselProps } from "./types";

// ----- open/close animation timing -----
/** Backdrop fade-in duration (ms). The modal only mounts once this completes,
 *  so the user sees a smooth darkening before any UI appears. */
const BACKDROP_FADE_MS = 220;
/** Backdrop fade-out duration (ms). The modal unmounts immediately; the
 *  backdrop lingers for this long so the close feels deliberate. */
const BACKDROP_EXIT_MS = 200;

/**
 * Reusable image / category carousel with an optional fullscreen lightbox.
 *
 *  • `purpose="gallery"` (default) — clicking a slide opens a lightbox.
 *  • `purpose="link"` — slides are anchors instead of lightbox triggers.
 *  • `mobileColumn` — renders a stacked column on small viewports and a
 *    horizontal carousel on `lg+`. The lightbox is only available on
 *    `lg+` (where the carousel lives) and closes automatically if the
 *    viewport shrinks below `lg` while open.
 */
export default function ImageGalleryCarousel({
  circle = false,
  multiWidth = false,
  mobileColumn = false,
  images,
  category,
  purpose = "gallery",
  href,
}: ImageGalleryCarouselProps) {
  const [sectionRef, inView] = useInView<HTMLElement>();
  const { dir, lang, t } = useLanguage();

  const items = toCarouselItems(images, category);
  const itemCount = items.length;
  const hasCategoryCta = !!category && category.length > 0;

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false,
    direction: dir === "rtl" ? "rtl" : "ltr",
  });

  // Cursor circle (desktop only) — motion values, no re-render per mouse event.
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const [hovering, setHovering] = useState(false);

  // Lightbox open animation is two-stage:
  //   1. `requestedIndex` flips to the target — a backdrop overlay fades
  //      in over the page (no modal yet, so no flicker).
  //   2. After `BACKDROP_FADE_MS` the timer commits the index, which
  //      actually mounts the `LightboxModal`. The user perceives a smooth
  //      darken → modal reveal rather than a sudden pop-in.
  // On close, `requestedIndex` clears and the `useEffect` below clears
  // the pending commit timer (without firing it) — the modal unmounts
  // immediately while the backdrop fades out independently.
  const [requestedIndex, setRequestedIndex] = useState<number | null>(null);
  const [committedIndex, setCommittedIndex] = useState<number | null>(null);

  const isTouch = useIsTouch();
  const isLg = useIsLg();

  // When `requestedIndex` becomes non-null, schedule the modal mount after
  // the backdrop fade-in. On close (`requestedIndex` → null) the cleanup
  // clears the pending timer, so the modal never mounts in that case.
  useEffect(() => {
    if (requestedIndex === null) return;
    const t = setTimeout(
      () => setCommittedIndex(requestedIndex),
      BACKDROP_FADE_MS,
    );
    return () => clearTimeout(t);
  }, [requestedIndex]);

  // Effective values — collapse to null on small viewports so the modal
  // and backdrop are both hidden even if the user resizes down while open.
  // (No effect needed — these are pure derivations of the existing state.)
  const effectiveRequested = isLg ? requestedIndex : null;
  const effectiveCommitted = isLg ? committedIndex : null;

  // Stable callbacks. `openLightbox` is ignored on small viewports where
  // the modal isn't rendered. `closeLightbox` clears BOTH the requested
  // and committed indices in the same event handler so the modal
  // unmounts immediately (otherwise `committedIndex` would still hold
  // the open slide and the modal would stay mounted).
  const openLightbox = useCallback(
    (i: number) => {
      if (!isLg) return;
      setRequestedIndex(i);
    },
    [isLg],
  );
  const closeLightbox = useCallback(() => {
    setRequestedIndex(null);
    setCommittedIndex(null);
  }, []);

  const handleMouseMove = (e: ReactMouseEvent<HTMLElement>) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
  };

  if (itemCount === 0) return null;

  return (
    <HomepageSection
      ref={sectionRef}
      className="w-full overflow-hidden py-20 md:py-28 lg:py-32"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-10 flex items-end justify-between md:mb-14">
        <SectionSubTitle>{t("ui.imageGallery")}</SectionSubTitle>
      </div>

      {mobileColumn && (
        <MobileColumn
          items={items}
          purpose={purpose}
          href={href}
          onOpen={openLightbox}
        />
      )}

      {/* Carousel — Embla viewport (hidden on mobile when mobileColumn is true). */}
      <div className={mobileColumn ? "hidden lg:block" : ""}>
        <div
          ref={emblaRef}
          className="no-scrollbar mx-auto cursor-grab overflow-hidden pb-2 active:cursor-grabbing"
        >
          <div
            className={cn("carousel flex gap-4 md:gap-10", inView && "in-view")}
          >
            {items.map((item, i) => (
              <Slide
                key={item.image}
                index={i}
                image={item.image}
                multiWidth={multiWidth}
                hasCategoryCta={hasCategoryCta}
                fontClass={lang === "fa" ? "font-noora" : "font-din"}
                t={t}
                cta={isCategoryItem(item) ? item : null}
                href={purpose === "link" ? (item.link ?? href) : undefined}
                onOpen={openLightbox}
              />
            ))}
          </div>
        </div>
      </div>

      {circle && !isTouch && (
        <CursorCircle
          x={cursorX}
          y={cursorY}
          visible={hovering}
          isRtl={dir === "rtl"}
        />
      )}

      {/* Two-stage lightbox open:
          1. A backdrop overlay fades in (portaled to escape the
             framer-motion `transform` containing block).
          2. After the fade, the modal mounts and replaces the backdrop
             with its own opaque bg. Closing: backdrop fades out
             while the modal unmounts immediately. */}
      {createPortal(
        <AnimatePresence>
          {effectiveRequested !== null && (
            <motion.div
              key="lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: BACKDROP_EXIT_MS / 1000,
                ease: "easeOut",
              }}
              className="fixed inset-0 z-150 bg-black/90"
              aria-hidden
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {effectiveCommitted !== null && (
        <LightboxModal
          items={items}
          startIndex={effectiveCommitted}
          onClose={closeLightbox}
        />
      )}
    </HomepageSection>
  );
}
