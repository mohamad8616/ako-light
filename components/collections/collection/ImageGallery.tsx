"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const images = [
  {
    src: "https://loremflickr.com/1800/900/interior?lock=11",
    alt: "Modern interior",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=12",
    alt: "Modern living room",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=13",
    alt: "Modern architecture",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=14",
    alt: "Interior design",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=15",
    alt: "Luxury interior",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=16",
    alt: "Minimal interior",
  },
  {
    src: "https://loremflickr.com/1800/900/interior?lock=17",
    alt: "Contemporary interior",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=18",
    alt: "Living space",
  },
  {
    src: "https://loremflickr.com/1200/1300/interior?lock=19",
    alt: "Architectural interior",
  },
];

const rowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 70,
  },

  visible: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const VIEWPORT = { once: true, amount: 0.15 } as const;

/** Desktop grid: 3 columns; `span: 2` cells are the wide ones (rows 1 & 3). */
const desktopLayout = [
  { index: 0, span: 2 },
  { index: 1, span: 1 },
  { index: 2, span: 1 },
  { index: 3, span: 1 },
  { index: 4, span: 1 },
  { index: 5, span: 1 },
  { index: 6, span: 2 },
] as const;

interface GalleryCellProps {
  src: string;
  alt: string;
  wide?: boolean;
  index?: number;
}

function GalleryCell({ src, alt, wide = false, index }: GalleryCellProps) {
  return (
    <motion.div
      variants={rowVariants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={index !== undefined ? { delay: index * 0.08 } : undefined}
      className={`relative overflow-hidden ${
        wide ? "col-span-2 aspect-[2/0.94]" : "aspect-[1/0.94]"
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={wide ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
        className="object-cover"
      />
    </motion.div>
  );
}

export default function ImageGallery() {
  return (
    <section className="bg-[#f1f1ef]">
      <div className="mx-auto max-w-[1448px] px-[25px] lg:px-0">
        {/* Heading */}
        <h2 className="mb-[88px] text-[12px] leading-none tracking-[-0.2px] text-[#222] uppercase lg:mb-[90px] lg:text-[16px]">
          IMAGE GALLERY
        </h2>

        {/* ================================================== */}
        {/* DESKTOP */}
        {/* ================================================== */}

        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-[2px]">
          {desktopLayout.map(({ index, span }) => (
            <GalleryCell
              key={index}
              src={images[index].src}
              alt={images[index].alt}
              wide={span === 2}
            />
          ))}
        </div>

        {/* ================================================== */}
        {/* MOBILE / TABLET */}
        {/* ================================================== */}

        <div className="flex flex-col gap-[2px] lg:hidden">
          {images.slice(0, 3).map((image, index) => (
            <motion.div
              key={image.src}
              variants={rowVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
              transition={{ delay: index * 0.08 }}
              className="relative aspect-[0.88/1] w-full overflow-hidden"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
