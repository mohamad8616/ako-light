"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

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

export default function ImageGalleryCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Cursor position in *viewport* coordinates (not relative to any
  // scrolling container), since the circle is `fixed` — this is what lets
  // it stay perfectly under the cursor even while the track underneath is
  // mid-drag.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 260, damping: 28, mass: 0.4 });
  const springY = useSpring(mouseY, { stiffness: 260, damping: 28, mass: 0.4 });

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      setMaxDrag(Math.max(0, el.scrollWidth - el.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="relative w-full overflow-hidden border-y border-white/10 bg-black py-20 md:py-28"
    >
      <div className="mx-auto mb-10 max-w-[1900px] px-6 md:mb-14 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-2xl font-light uppercase tracking-tight text-white md:text-4xl"
        >
          Image Gallery
        </motion.h2>
      </div>

      <motion.div
        ref={containerRef}
        className="no-scrollbar flex cursor-none gap-5 overflow-x-auto px-6 pb-2 sm:gap-6 md:px-12 lg:gap-8 lg:px-20 xl:px-[8.5vw]"
        drag="x"
        dragConstraints={{ left: -maxDrag, right: 0 }}
        dragElastic={0.06}
        dragTransition={{ power: 0.25, timeConstant: 200 }}
      >
        {images.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: (i % 6) * 0.06, ease: EASE }}
            className="relative w-[70vw] shrink-0 overflow-hidden sm:w-[46vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]"
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="aspect-[4/5] h-full w-full object-cover"
            />
          </motion.div>
        ))}
        <div className="w-2 shrink-0 sm:w-4" aria-hidden="true" />
      </motion.div>

      {/* The color-inverting cursor circle. mix-blend-mode: difference means
          the browser subtracts this circle's color from whatever is behind
          it at the pixel level — over a light image it reads as dark, over
          a dark image it reads as light, entirely automatically. No manual
          per-section color swapping needed. Deliberately no content inside
          it: text/icons here would inherit the same blend mode against the
          backdrop (not against the circle's own white first) unless wrapped
          in `isolate`, which can look glitchy — a plain shape is the
          reliable version of this effect. */}
      <motion.div
        style={{ left: springX, top: springY }}
        animate={{ scale: hovering ? 1 : 0, opacity: hovering ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="pointer-events-none fixed z-50 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference md:block"
      />
    </section>
  );
}
