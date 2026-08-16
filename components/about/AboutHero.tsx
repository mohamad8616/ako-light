"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { EASE } from "../ui/HomepageSection";
import ScrollIndicator from "../ui/ScrollIndicator";

export default function AboutHero() {
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
        <source src="/videos/hero.mp4" type="video/mp4" />
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
          opacity: circleVisible ? 1 : 0,
        }}
        transition={{ duration: 0.4, ease: EASE }}
        className="pointer-events-none absolute z-20 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white md:flex"
      >
        <Play size={22} className="ml-1 fill-black text-black" />
      </motion.div>

      {/* Hero copy — bottom-left, same alignment convention as the
          homepage hero */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 md:px-12 md:pb-20 lg:px-20 lg:pb-24 xl:px-[8.5vw]">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
            className="text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl xl:text-8xl"
          >
            The Metaphysics of Beauty
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
            className="mt-2 text-lg font-medium uppercase leading-tight tracking-tight text-white md:text-2xl lg:text-3xl"
          >
            Henge&rsquo;s world is incredibly rich of unique materials
          </motion.h2>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
          onMouseEnter={() => setOverInteractive(true)}
          onMouseLeave={() => setOverInteractive(false)}
          className="group relative z-30 mt-6 flex items-center gap-2 uppercase text-white md:mt-8"
        >
          <span className="inline-block text-2xl leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
            +
          </span>
          <span className="relative text-sm font-medium tracking-[0.2em]">
            Play
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-[width] duration-300 group-hover:w-full" />
          </span>
        </motion.button>
        {/* Scroll indicator */}
        <ScrollIndicator />
      </div>
    </section>
  );
}
