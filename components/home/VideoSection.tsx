/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import HomepageSection from "../ui/HomepageSection";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function VideoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Becomes true once the section scrolls into view — this is what
  // triggers the (possibly large) video source to actually start loading.
  const [shouldLoad, setShouldLoad] = useState(false);
  // Becomes true once the video reports it's actually playing, so we
  // know it's safe to fade the "AKO LIGHTING" placeholder out.
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          videoRef.current?.play().catch(() => {
            // Autoplay can be blocked in rare cases (e.g. low-power mode);
            // the placeholder just stays visible until the user interacts.
          });
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <HomepageSection className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div ref={sectionRef} className="relative">
          <div className="relative aspect-video w-full overflow-hidden bg-background">
            {/* Placeholder shown until the video is actually playing */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: EASE }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background"
                >
                  <span className="text-sm font-light uppercase tracking-[0.4em] text-background-secondary md:text-base">
                    AKO LIGHTING
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video only gets a source once it's scrolled into view, so a
                large file is never fetched before it's needed. */}
            {shouldLoad && (
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="none"
                onPlaying={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="h-full w-full object-cover"
              >
                <source src="/afterhenge.mp4" type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
