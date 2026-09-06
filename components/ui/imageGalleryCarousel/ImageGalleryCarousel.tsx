"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import useEmblaCarousel from "embla-carousel-react";
import { useMotionValue } from "framer-motion";
import {
  useCallback,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import CursorCircle from "./CursorCircle";
import { isCategoryItem, toCarouselItems } from "./helpers";
import { useInView, useIsLg, useIsTouch } from "./hooks";
import LightboxModal from "./LightboxModal";
import MobileColumn from "./MobileColumn";
import Slide from "./Slide";
import type { ImageGalleryCarouselProps } from "./types";

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

  // Active lightbox slide; `null` = modal closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isTouch = useIsTouch();
  const isLg = useIsLg();

  // Stable callback — ignored on small viewports where the modal isn't rendered.
  const openLightbox = useCallback(
    (i: number) => {
      if (!isLg) return;
      setLightboxIndex(i);
    },
    [isLg],
  );

  // Effective lightbox index — collapses to null on small viewports so
  // the modal is automatically hidden if the user resizes down.
  const effectiveLightboxIndex = isLg ? lightboxIndex : null;

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

      {effectiveLightboxIndex !== null && (
        <LightboxModal
          items={items}
          startIndex={effectiveLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </HomepageSection>
  );
}
