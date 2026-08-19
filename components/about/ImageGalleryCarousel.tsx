// /* eslint-disable @next/next/no-img-element */
// "use client";

// import HomepageSection, { EASE } from "../../utility/HomepageSection";
// import { motion, useMotionValue, useSpring } from "framer-motion";
// import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// const images = [
//   "https://www.henge07.com/app/uploads/2023/04/H19_FOTO_01.jpg",
//   "https://www.henge07.com/app/uploads/2025/07/Henge0301-1.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_4403.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_5741.jpg",
//   "https://www.henge07.com/app/uploads/2025/07/Henge_0793-SG.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/henge-24092016809m.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/IMG_3166.jpg",
//   "https://www.henge07.com/app/uploads/2025/07/Henge0391.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/IMG_3168.jpg",
//   "https://www.henge07.com/app/uploads/2025/07/Henge0481.jpg",
//   "https://www.henge07.com/app/uploads/2023/04/IMG5_43789.jpg",
//   "https://www.henge07.com/app/uploads/2025/07/Henge0312-1.jpg",
// ];

// const subscribeToPointer = (callback: () => void) => {
//   const mql = window.matchMedia("(hover: none), (pointer: coarse)");
//   mql.addEventListener("change", callback);
//   return () => mql.removeEventListener("change", callback);
// };

// const getPointerSnapshot = () =>
//   window.matchMedia("(hover: none), (pointer: coarse)").matches;

// const getServerSnapshot = () => false;

// export default function ImageGalleryCarousel() {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [maxDrag, setMaxDrag] = useState(0);
//   const [hovering, setHovering] = useState(false);
//   const isTouch = useSyncExternalStore(
//     subscribeToPointer,
//     getPointerSnapshot,
//     getServerSnapshot
//   );

//   // Cursor position in *viewport* coordinates (not relative to any
//   // scrolling container), since the circle is `fixed` — this is what lets
//   // it stay perfectly under the cursor even while the track underneath is
//   // mid-drag.
//   const mouseX = useMotionValue(0);
//   const mouseY = useMotionValue(0);
//   const springX = useSpring(mouseX, { stiffness: 260, damping: 28, mass: 0.4 });
//   const springY = useSpring(mouseY, { stiffness: 260, damping: 28, mass: 0.4 });

//   useEffect(() => {
//     const measure = () => {
//       const el = containerRef.current;
//       if (!el) return;
//       setMaxDrag(Math.max(0, el.scrollWidth - el.clientWidth));
//     };
//     measure();
//     window.addEventListener("resize", measure);
//     return () => window.removeEventListener("resize", measure);
//   }, []);

//   const handleMouseMove = (e: React.MouseEvent) => {
//     mouseX.set(e.clientX);
//     mouseY.set(e.clientY);
//   };

//   return (
//     <HomepageSection
//       className="bg-background-secondary w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32"
//       onMouseMove={handleMouseMove}
//       onMouseEnter={() => setHovering(true)}
//       onMouseLeave={() => setHovering(false)}
//     >
//       <div className="mx-auto mb-10 flex max-w-[1600px] items-end justify-between px-6 md:mb-14 md:px-12 lg:px-20 xl:px-[8.5vw]">
//         <motion.h2
//           initial={{ opacity: 0, y: 24 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           transition={{ duration: 0.7, ease: EASE }}
//           className="text-2xl font-light uppercase tracking-tight text-white md:text-4xl"
//         >
//           Image Gallery
//         </motion.h2>
//       </div>

//       {/*
//         Below lg (1024px): a simple single-column stack of full-width images.
//         At lg+: the horizontal drag-scroll carousel (same as HomeCarousel).
//       */}
//       <motion.div
//         ref={containerRef}
//         className={`no-scrollbar mx-auto grid max-w-[1600px] grid-cols-1 gap-1 px-6 pb-2 sm:gap-6 md:px-12 lg:flex lg:cursor-grab lg:gap-8 lg:overflow-x-auto lg:px-20 lg:active:cursor-grabbing xl:px-[8.5vw] ${
//           isTouch ? "snap-x snap-proximity" : ""
//         }`}
//         {...(!isTouch && {
//           drag: "x",
//           dragConstraints: { left: -maxDrag, right: 0 },
//           dragElastic: 0.06,
//           dragTransition: { power: 0.25, timeConstant: 200 },
//         })}
//       >
//         {images.map((src, i) => (
//           <motion.div
//             key={src}
//             initial={{ opacity: 0, y: 30 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-40px" }}
//             transition={{ duration: 0.6, delay: (i % 6) * 0.06, ease: EASE }}
//             className={`group relative w-full shrink-0 xs:w-[56vw] sm:w-[40vw] md:w-[31vw] lg:w-[24vw] xl:w-[20vw] ${
//               isTouch ? "snap-start" : ""
//             }`}
//           >
//             <div className="relative aspect-4/5 w-full overflow-hidden bg-[#111]">
//               <img
//                 src={src}
//                 alt=""
//                 draggable={false}
//                 className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
//               />
//               <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
//             </div>
//           </motion.div>
//         ))}

//         {/* trailing spacer so the last card can be dragged fully into view */}
//         <div className="w-2 shrink-0 sm:w-4" aria-hidden="true" />
//       </motion.div>

//       {/* The color-inverting cursor circle. mix-blend-mode: difference means
//           the browser subtracts this circle's color from whatever is behind
//           it at the pixel level — over a light image it reads as dark, over
//           a dark image it reads as light, entirely automatically. No manual
//           per-section color swapping needed. Deliberately no content inside
//           it: text/icons here would inherit the same blend mode against the
//           backdrop (not against the circle's own white first) unless wrapped
//           in `isolate`, which can look glitchy — a plain shape is the
//           reliable version of this effect. */}
//       <motion.div
//         style={{ left: springX, top: springY }}
//         animate={{ scale: hovering ? 1 : 0, opacity: hovering ? 1 : 0 }}
//         transition={{ duration: 0.4, ease: EASE }}
//         className="pointer-events-none fixed z-50 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference md:block"
//       />
//     </HomepageSection>
//   );
// }

/* eslint-disable @next/next/no-img-element */
"use client";

import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// ----- images array (unchanged) -----
const images = [
  "https://www.henge07.com/app/uploads/2023/04/H19_FOTO_01.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0301-1.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_4403.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_5741.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge_0793-SG.jpg",
  "https://www.henge07.com/app/uploads/2023/04/henge-24092016809m.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3166.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0391.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3168.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0481.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG5_43789.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0312-1.jpg",
];

// ----- detect touch/coarse pointer (unchanged) -----
const subscribeToPointer = (callback: () => void) => {
  const mql = window.matchMedia("(hover: none), (pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getPointerSnapshot = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches;
const getServerSnapshot = () => false;

export default function ImageGalleryCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // ----- drag state -----
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // ----- entry animation state -----
  const [inView, setInView] = useState(false);

  // ----- circle cursor state -----
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    getPointerSnapshot,
    getServerSnapshot,
  );

  // ----- measure max scroll on resize -----
  useEffect(() => {
    const measure = () => {
      const el = carouselRef.current;
      if (!el) return;
      setMaxScroll(Math.max(0, el.scrollWidth - el.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ----- IntersectionObserver for entry animation -----
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

  // ----- drag scroll (mouse only, non‑touch) -----
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || maxScroll === 0) return;
    const el = carouselRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.clientX);
    setStartScrollLeft(el.scrollLeft);
    // prevent text selection / default drag
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    // update cursor position for the circle
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  // global mouse move/up for drag
  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const el = carouselRef.current;
      if (!el) return;
      const delta = startX - e.clientX;
      let newScrollLeft = startScrollLeft + delta;
      // clamp
      newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
      el.scrollLeft = newScrollLeft;
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, startX, startScrollLeft, maxScroll]);

  // ----- cursor circle scale/opacity (CSS transitions) -----
  const circleStyle = {
    left: cursorPos.x,
    top: cursorPos.y,
    opacity: hovering ? 1 : 0,
    transform: "translate(-50%, -50%) scale(" + (hovering ? 1 : 0) + ")",
    transition:
      "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <HomepageSection
      ref={sectionRef}
      className="w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-10 flex max-w-[1600px] items-end justify-between px-6 md:mb-14 md:px-12">
        <SectionSubTitle>Image Gallery</SectionSubTitle>
      </div>

      {/* ----- carousel container ----- */}
      <div
        ref={carouselRef}
        className={`no-scrollbar grid max-w-[1600px] grid-cols-1 gap-1 px-6 pb-2 sm:gap-6 md:px-12 lg:flex lg:cursor-grab lg:gap-8 lg:overflow-x-auto lg:active:cursor-grabbing ${
          isTouch ? "snap-x snap-proximity" : ""
        } ${inView ? "in-view" : ""}`}
        onMouseDown={handleMouseDown}
      >
        {images.map((src, i) => (
          <div
            key={src}
            className={`group relative w-full shrink-0 lg:w-[24vw] xl:w-[38vw] ${
              isTouch ? "snap-start" : ""
            }`}
            style={{
              transitionDelay: `${(i % 6) * 0.06}s`,
            }}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-[#111]">
              <img
                src={src}
                alt=""
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
            </div>
          </div>
        ))}

        {/* trailing spacer */}
        <div className="w-2 shrink-0 sm:w-4" aria-hidden="true" />
      </div>

      {/* ----- cursor circle with arrow ----- */}
      {!isTouch && (
        <div
          className="pointer-events-none fixed z-50 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference md:flex md:items-center md:justify-center"
          style={circleStyle}
        >
          {/* Arrow pointing top‑right */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white mix-blend-difference"
          >
            <path d="M7 7h10v10" />
            <path d="M7 17L17 7" />
          </svg>
        </div>
      )}
    </HomepageSection>
  );
}
