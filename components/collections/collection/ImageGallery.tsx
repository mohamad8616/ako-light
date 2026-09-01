"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import HomepageSection from "@/utility/HomepageSection";
import PlusTextBtn from "@/components/ui/PlusTextBtn";


const images = [
  { src: "https://loremflickr.com/2400/1200/interior?lock=20", alt: "Modern interior" },
  { src: "https://loremflickr.com/1920/1280/architecture?lock=21", alt: "Modern living room" },
  { src: "https://loremflickr.com/1920/1280/design?lock=23", alt: "Interior design" },
  { src: "https://loremflickr.com/1920/1280/furniture?lock=24", alt: "Interior design" },
  { src: "https://loremflickr.com/1920/1280/livingroom?lock=25", alt: "Luxury interior" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=16", alt: "Minimal interior" },
  { src: "https://loremflickr.com/1800/900/interior?lock=17", alt: "Contemporary interior" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=18", alt: "Living space" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=19", alt: "Architectural interior" },
];

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 70 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const VIEWPORT = { once: true, amount: 0.15 } as const;

// One full pattern cycle = 3 rows = 7 images (wide+single, triple, single+wide).
// Shown by default on desktop before "Load More" is clicked.
const INITIAL_DESKTOP_COUNT = 7;
const MOBILE_RANDOM_MIN = 1;
const MOBILE_RANDOM_MAX = 4;

type CellVariant = "wide" | "edgeSingle" | "tripleSingle" | "lone";

interface DesktopCell {
  index: number;
  span: 1 | 2 | 3;
  variant: CellVariant;
}

interface DesktopRow {
  cells: DesktopCell[];
}

/**
 * Builds the repeating 3-row pattern for however many images are visible:
 * row type 0 → wide + single, row type 1 → three singles, row type 2 →
 * single + wide, then repeats. Handles any total gracefully, including a
 * final incomplete row.
 */
function buildDesktopRows(total: number): DesktopRow[] {
  const rows: DesktopRow[] = [];
  let i = 0;
  let cycle = 0;

  while (i < total) {
    const remaining = total - i;
    const posInCycle = cycle % 3;

    if (posInCycle === 0 || posInCycle === 2) {
      // wide+single (pos 0) or single+wide (pos 2) — normally 2 images
      if (remaining === 1) {
        rows.push({ cells: [{ index: i, span: 3, variant: "lone" }] });
        i += 1;
      } else {
        const wideFirst = posInCycle === 0;
        rows.push({
          cells: [
            { index: i, span: wideFirst ? 2 : 1, variant: wideFirst ? "wide" : "edgeSingle" },
            { index: i + 1, span: wideFirst ? 1 : 2, variant: wideFirst ? "edgeSingle" : "wide" },
          ],
        });
        i += 2;
      }
    } else {
      // triple row — up to 3 images
      const count = Math.min(3, remaining);
      rows.push({
        cells: Array.from({ length: count }, (_, k) => ({
          index: i + k,
          span: 1 as const,
          variant: "tripleSingle" as const,
        })),
      });
      i += count;
    }
    cycle++;
  }

  return rows;
}

const aspectClassByVariant: Record<CellVariant, string> = {
  wide: "aspect-[2.16/1]",
  edgeSingle: "aspect-[1.07/1]",
  tripleSingle: "aspect-[1.28/1]",
  lone: "aspect-[2.4/1]",
};

const spanClassBySpan: Record<1 | 2 | 3, string> = {
  1: "",
  2: "col-span-2",
  3: "col-span-3",
};

/**
 * Math.random() would differ between the server render and the client's
 * first (hydration) render, causing a mismatch — so this always reports a
 * fixed value (MOBILE_RANDOM_MAX) for SSR/hydration via getServerSnapshot,
 * then settles on one true random value, generated once and cached, right
 * after mount. Same pattern as the earlier useIsDesktop/useWishlistHydrated
 * fixes — no effect, no setState-in-effect warning.
 */
function useRandomMobileCount(min: number, max: number) {
  const cachedValue = useRef<number | null>(null);

  const subscribe = useCallback(() => () => {}, []); // value never changes after first computed

  const getSnapshot = useCallback(() => {
    if (cachedValue.current === null) {
      cachedValue.current = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return cachedValue.current;
  }, [min, max]);

  const getServerSnapshot = useCallback(() => max, [max]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ImageGallery() {
  const [expanded, setExpanded] = useState(false);
  const mobileInitialCount = useRandomMobileCount(MOBILE_RANDOM_MIN, MOBILE_RANDOM_MAX);

  const desktopRows = buildDesktopRows(
    expanded ? images.length : Math.min(images.length, INITIAL_DESKTOP_COUNT)
  );
  const mobileImages = expanded ? images : images.slice(0, mobileInitialCount);

  return (
    <HomepageSection>
      {/* Heading */}
      <h2 className="mb-22 text-[12px] leading-none tracking-[-0.2px] text-[#222] uppercase lg:mb-22.5 lg:text-[16px]">
        IMAGE GALLERY
      </h2>

      {/* ================================================== */}
      {/* DESKTOP */}
      {/* ================================================== */}

      <div className="hidden flex-col gap-2 lg:flex">
        {desktopRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-3 gap-2">
            {row.cells.map((cell, cellIndex) => (
              <GalleryCell
                key={cell.index}
                src={images[cell.index].src}
                alt={images[cell.index].alt}
                span={cell.span}
                variant={cell.variant}
                index={rowIndex * 3 + cellIndex}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ================================================== */}
      {/* MOBILE / TABLET */}
      {/* ================================================== */}

      <div className="flex flex-col gap-4 lg:hidden">
        {mobileImages.map((image, index) => (
          <motion.div
            key={image.src}
            variants={rowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            transition={{ delay: index * 0.08 }}
            className="relative aspect-[0.88/1] w-full overflow-hidden"
          >
            <Image src={image.src} alt={image.alt} fill sizes="100vw" className="object-cover" />
          </motion.div>
        ))}
      </div>

      {!expanded && (
        <div className="mt-12 flex justify-center">
          <PlusTextBtn text="Load More" textColor="text-[#222]" onClick={() => setExpanded(true)} />
        </div>
      )}
    </HomepageSection>
  );
}

function GalleryCell({
  src,
  alt,
  span,
  variant,
  index,
}: {
  src: string;
  alt: string;
  span: 1 | 2 | 3;
  variant: CellVariant;
  index: number;
}) {
  return (
    <motion.div
      variants={rowVariants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={{ delay: index * 0.08 }}
      className={`relative overflow-hidden ${spanClassBySpan[span]} ${aspectClassByVariant[variant]}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={span >= 2 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
        className="object-cover"
      />
    </motion.div>
  );
}
