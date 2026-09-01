"use client";

import { productCategories } from "@/lib/data/productCategories";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Size of the tracking photo box — tune to taste.
const PHOTO_HEIGHT = 200;
// How far (px) the photo slides in/out on its first appearance/disappearance.
const ENTER_EXIT_OFFSET = 500;

function useIsDesktop(breakpointPx = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    setIsDesktop(query.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [breakpointPx]);

  return isDesktop;
}

interface HoveredState {
  slug: string;
  image: string;
  y: number;
}

export default function ProductsInCollectionSection() {
  const isDesktop = useIsDesktop();
  const listRef = useRef<HTMLDivElement>(null);

  // Tracks scroll direction continuously; read (not subscribed to) at the
  // moment a hover session starts, so entrance direction reflects "which
  // way was the page scrolling when the photo first appeared."
  const scrollDirectionRef = useRef<"up" | "down">("down");
  const lastScrollYRef = useRef(0);

  const [hovered, setHovered] = useState<HoveredState | null>(null);
  // Locked in once per hover "session" (null → non-null transition) so
  // the exit animation mirrors the entrance, even if scroll direction
  // changes — or stops entirely — while a product is being hovered.
  const [enterFromTop, setEnterFromTop] = useState(true);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    function handleScroll() {
      const currentY = window.scrollY;
      scrollDirectionRef.current =
        currentY > lastScrollYRef.current ? "down" : "up";
      lastScrollYRef.current = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleItemHover(slug: string, image: string, target: HTMLElement) {
    if (!isDesktop || !listRef.current) return;

    if (!hovered) {
      // Fresh session — lock in the entrance direction now.
      setEnterFromTop(scrollDirectionRef.current === "down");
    }

    const targetRect = target.getBoundingClientRect();
    const containerRect = listRef.current.getBoundingClientRect();
    const centerY = targetRect.top - containerRect.top + targetRect.height / 2;

    setHovered({ slug, image, y: centerY - PHOTO_HEIGHT / 2 });
  }

  function handleListLeave() {
    if (!isDesktop) return;
    setHovered(null);
  }

  return (
    <section className="bg-stone-950 px-6 py-24 md:px-12 md:py-32 lg:px-20 xl:px-[8.5vw]">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr_1.7fr] lg:items-start lg:gap-16 xl:gap-20">
        {/* Heading */}
        <div>
          <h1 className="font-din text-4xl font-bold tracking-tight text-white uppercase md:text-5xl lg:text-6xl">
            Products in the
          </h1>
          <Link
            href="/products"
            className="font-din mt-10 flex w-fit items-center gap-2 text-xs font-medium tracking-tighter text-white uppercase transition-colors hover:text-stone-400"
          >
            <Plus size={12} strokeWidth={2.5} />
            View all products
          </Link>
        </div>

        {/* Tracking photo — desktop only */}
        <div className="relative hidden lg:block">
          <AnimatePresence>
            {hovered && (
              <motion.div
                key="tracking-photo"
                initial={{
                  opacity: 0,
                  y:
                    hovered.y +
                    (enterFromTop ? -ENTER_EXIT_OFFSET : ENTER_EXIT_OFFSET),
                }}
                animate={{ opacity: 1, y: hovered.y }}
                exit={{
                  opacity: 0,
                  y:
                    hovered.y +
                    (enterFromTop ? -ENTER_EXIT_OFFSET : ENTER_EXIT_OFFSET),
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 left-0 w-full overflow-hidden bg-[#111]"
                style={{ height: PHOTO_HEIGHT }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={hovered.slug}
                    src={hovered.image}
                    alt=""
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.5 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="aspect-video h-full w-full object-cover"
                  />
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category / product list */}
        <div
          ref={listRef}
          onMouseLeave={handleListLeave}
          className="flex flex-col gap-10"
        >
          {productCategories.map((category) => (
            <div
              key={category.slug}
              className="flex flex-col lg:grid lg:grid-cols-[180px_1fr] lg:items-start lg:gap-6"
            >
              <h2 className="font-din border-b border-white/10 pb-2 text-sm font-medium text-white lg:border-none lg:pb-0">
                {category.name}
              </h2>

              <div className="mt-4 flex flex-col gap-2 lg:mt-0">
                {category.subCategories.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/products/${category.slug}/${sub.slug}`}
                    onMouseEnter={(e) =>
                      handleItemHover(sub.slug, sub.hoverImage, e.currentTarget)
                    }
                    className={`font-din w-fit text-sm tracking-tight uppercase transition-colors duration-200 ${
                      hovered?.slug === sub.slug
                        ? "font-bold text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
