// components/SmoothScroll.tsx
"use client";

import { useLenis } from "@/lib/lenisStore";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import Lenis from "lenis";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const { setLenis } = useLenis();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8, // ← heavier/slower feel
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo easing
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.8, // ← reduce for heavier feel
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;
    setLenis(lenis);

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      setLenis(null);
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, [setLenis]);

  return <>{children}</>;
}
