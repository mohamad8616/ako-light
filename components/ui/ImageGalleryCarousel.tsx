"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import PlusTextBtn from "./PlusTextBtn";

// ----- types -----

type CategoryItem = {
  name: string;
  image: string;
  link: string;
};

type CarouselItem = {
  image: string;
  name?: string;
  link?: string;
};

type ImageGalleryCarouselProps = {
  circle?: boolean;
  multiWidth?: boolean;
  mobileColumn?: boolean;
  images?: string[];
  category?: CategoryItem[];
};

// ----- constants -----

const POINTER_QUERY = "(hover: none), (pointer: coarse)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const DEFAULT_SLIDE_WIDTHS =
  "w-[70vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]";

const DEFAULT_HEIGHT = "aspect-4/5";
const MULTI_HEIGHT = "h-[50vh] sm:h-[45vh] md:h-[50vh]";

// Pool of widths (in vw) used when `multiWidth` is enabled.
const MULTI_WIDTH_POOL = [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50] as const;

const FONT_BY_LANG = (lang: "en" | "fa") =>
  lang === "fa" ? "font-noora" : "font-din";

const IMAGE_TRANSITION = `transition-transform duration-[1.2s] ease-[${EASE}] group-hover:scale-110`;
const OVERLAY_TRANSITION =
  "transition-colors duration-500 group-hover:bg-black/15";

// ----- pointer detection (gates the cursor circle only) -----

const subscribeToPointer = (callback: () => void) => {
  const mql = window.matchMedia(POINTER_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getPointerSnapshot = () => window.matchMedia(POINTER_QUERY).matches;
const getServerSnapshot = () => false;

// ----- helpers -----

function pickRandomWidth(): number {
  return MULTI_WIDTH_POOL[Math.floor(Math.random() * MULTI_WIDTH_POOL.length)];
}

function generateRandomWidths(count: number): number[] {
  return Array.from({ length: count }, () => pickRandomWidth());
}

function toCarouselItems(
  images: string[] | undefined,
  category: CategoryItem[] | undefined,
): CarouselItem[] {
  if (category && category.length > 0) {
    return category.map((c) => ({
      image: c.image,
      name: c.name,
      link: c.link,
    }));
  }
  return (images ?? []).map((src) => ({ image: src }));
}

function isCategoryItem(item: CarouselItem): item is Required<CarouselItem> {
  return item.name !== undefined && item.link !== undefined;
}

// ----- main component -----

export default function ImageGalleryCarousel({
  circle = false,
  multiWidth = false,
  mobileColumn = false,
  images,
  category,
}: ImageGalleryCarouselProps) {
  const sectionRef = useRef<HTMLElement>(null);
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

  // Entry animation (fires once when section scrolls into view).
  const [inView, setInView] = useState(false);

  // Cursor circle (desktop only).
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  // Random widths for multiWidth mode — generated once per item count.
  const [randomWidths] = useState(() => generateRandomWidths(itemCount));

  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    getPointerSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: ReactMouseEvent<HTMLElement>) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
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

      {mobileColumn && <MobileColumn items={items} />}

      {/* Carousel — Embla viewport (hidden on mobile when mobileColumn is true). */}
      <div className={mobileColumn ? "hidden lg:block" : ""}>
        <div
          ref={emblaRef}
          className="no-scrollbar mx-auto cursor-grab overflow-hidden pb-2 active:cursor-grabbing"
        >
          <div
            className={cn("carousel flex gap-4 md:gap-6", inView && "in-view")}
          >
            {items.map((item, i) => (
              <Slide
                key={item.image}
                index={i}
                image={item.image}
                multiWidth={multiWidth}
                randomWidthVw={randomWidths[i]}
                hasCategoryCta={hasCategoryCta}
                fontClass={FONT_BY_LANG(lang)}
                t={t}
                cta={isCategoryItem(item) ? item : null}
              />
            ))}
          </div>
        </div>
      </div>

      {circle && !isTouch && (
        <CursorCircle
          x={cursorPos.x}
          y={cursorPos.y}
          visible={hovering}
          isRtl={dir === "rtl"}
        />
      )}
    </HomepageSection>
  );
}

// ----- slide -----

type SlideProps = {
  image: string;
  index: number;
  multiWidth: boolean;
  randomWidthVw?: number;
  hasCategoryCta: boolean;
  fontClass: string;
  t: (key: string) => string;
  cta: Required<CarouselItem> | null;
};

function Slide({
  image,
  index,
  multiWidth,
  randomWidthVw,
  hasCategoryCta,
  fontClass,
  t,
  cta,
}: SlideProps) {
  const isMultiWidth = multiWidth && randomWidthVw !== undefined;

  const widthClass = isMultiWidth ? "" : DEFAULT_SLIDE_WIDTHS;
  const heightClass = multiWidth ? MULTI_HEIGHT : DEFAULT_HEIGHT;
  const alt = hasCategoryCta && cta ? t(cta.name) : "";

  const style: CSSProperties = {
    transitionDelay: `${(index % 6) * 0.06}s`,
    ...(isMultiWidth && { width: `${randomWidthVw}vw` }),
  };

  return (
    <div
      style={style}
      className={cn(
        "group flex shrink-0 flex-col items-start justify-center gap-5",
        widthClass,
      )}
    >
      <div
        className={cn("relative w-full overflow-hidden bg-[#111]", heightClass)}
      >
        <Image
          src={image}
          alt={alt}
          fill
          className={cn("object-cover", IMAGE_TRANSITION)}
        />
        <div
          className={cn("absolute inset-0 bg-black/0", OVERLAY_TRANSITION)}
        />
      </div>
      {cta && (
        <PlusTextBtn
          text={t(cta.name)}
          href={cta.link}
          className={cn(fontClass, "text-background")}
          textColor="text-background"
        />
      )}
    </div>
  );
}

// ----- mobile column -----

function MobileColumn({ items }: { items: CarouselItem[] }) {
  const { lang, t } = useLanguage();
  const hasCategoryCta = items.some(isCategoryItem);
  const fontClass = FONT_BY_LANG(lang);

  return (
    <div className="mx-auto block lg:hidden">
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => {
          const cta = isCategoryItem(item) ? item : null;
          const alt = hasCategoryCta && cta ? t(cta.name) : "";
          return (
            <motion.div
              key={item.image}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="group flex w-full flex-col items-center justify-start gap-5"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-[#111]">
                <Image
                  src={item.image}
                  alt={alt}
                  fill
                  className={cn("object-cover", IMAGE_TRANSITION)}
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/0",
                    OVERLAY_TRANSITION,
                  )}
                />
              </div>
              {cta && (
                <PlusTextBtn
                  text={t(cta.name)}
                  href={cta.link}
                  className={fontClass}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ----- cursor circle -----

/**
 * Renders to `document.body` via a portal so it escapes any ancestor
 * `transform` / `filter` / `will-change` containing block. Without the
 * portal, a `position: fixed` cursor nested inside framer-motion's
 * `motion.section` would be positioned relative to the section (not
 * the viewport) and clipped to it.
 */
function CursorCircle({
  x,
  y,
  visible,
  isRtl,
}: {
  x: number;
  y: number;
  visible: boolean;
  isRtl: boolean;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 hidden h-20 w-20 rounded-full bg-white mix-blend-difference md:flex md:items-center md:justify-center"
      style={{
        left: x,
        top: y,
        translate: "-70% -70%",
        scale: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
        transition: `opacity 0.8s ${EASE}, scale 0.4s ${EASE}`,
      }}
    >
      {/* Arrow pointing top-right (top-left in RTL). */}
      <svg
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
      </svg>
    </div>,
    document.body,
  );
}
