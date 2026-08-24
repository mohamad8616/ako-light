"use client";

import { useEffect, useRef } from "react";

/**
 * Full-viewport video that starts playing the moment it scrolls into view
 * and pauses when it leaves — no visible controls or play button.
 *
 * Playback is driven by an IntersectionObserver (mirroring the pattern in
 * `components/home/VideoSection.tsx`) and the source is never fetched early
 * thanks to `preload="none"` + no `autoPlay` attribute: bytes only load the
 * first time `play()` is called, i.e. when the user actually scrolls here.
 */
export default function MiddleScreenVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return;
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {
            /* Autoplay can be blocked in rare environments (data-saver or
               low-power mode). In that case the video simply waits and
               starts on the next user interaction with the page. */
          });
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      className={`relative h-screen w-full overflow-hidden bg-black ${className || ""}`}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
    </section>
  );
}
