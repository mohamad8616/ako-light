"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { EASE } from "../../utility/HomepageSection";
import HeroSectionText from "./HeroSectionText";

export default function HeroVideo({
  firstLine,
  secondLine,
  btn,
  videoSrc,
}: {
  firstLine: string;
  secondLine: string;
  btn: string;
  videoSrc: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  // True while the cursor is over an interactive element (the play button)
  // that should suppress the circle rather than show it on top of a real
  // clickable target.
  const [overInteractive, setOverInteractive] = useState(false);

  // Raw cursor position → smoothed with a spring so the circle trails the
  // cursor with a slight, natural lag instead of snapping to it.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30, mass: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const circleVisible = hovering && !overInteractive;

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="relative h-screen w-full cursor-none overflow-hidden bg-black md:cursor-auto"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-black/40" />

      {/* Cursor-following play circle. Positioned with a HIGHER z-index
          than the video/overlay but LOWER than the global fixed Header
          (z-50) and below the play button itself — so it naturally stays
          hidden under the navbar (which sits on top and also intercepts
          the pointer, firing mouseleave on this section) and is
          explicitly suppressed over the button via `overInteractive`,
          without needing any cross-component logic. */}

      <motion.div
        style={{ left: springX, top: springY }}
        animate={{
          scale: circleVisible ? 1 : 0,
          opacity: circleVisible ? 0.6 : 0,
        }}
        transition={{ duration: 0.4, ease: EASE }}
        className="pointer-events-none absolute z-20 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white md:flex"
      >
        <Play size={22} className="ml-1 fill-black text-black" />
      </motion.div>

      <HeroSectionText firstLine={firstLine} secondLine={secondLine} btn={btn} />
    </section>
  );
}
