"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLenis } from "@/lib/lenisStore";
import { useHeroVideoStore } from "@/lib/heroVideoStore";
import { useMotionValue } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import HeroSectionText from "./HeroSectionText";
import PlayCircle from "./PlayCircle";

type HeroVideoProps = {
  firstLineKey?: string;
  secondLineKey?: string;
  btnKey?: string;
  videoSrc: string;
  firstLine?: string;
  secondLine?: string;
  btn?: string;
};

export default function HeroVideo({
  firstLineKey,
  secondLineKey,
  btnKey,
  videoSrc,
  firstLine: firstLineProp,
  secondLine: secondLineProp,
  btn: btnProp,
}: HeroVideoProps) {
  const { t } = useLanguage();

  const firstLine = firstLineKey ? t(firstLineKey) : (firstLineProp ?? "");
  const secondLine = secondLineKey ? t(secondLineKey) : (secondLineProp ?? "");
  const btn = btnKey ? t(btnKey) : (btnProp ?? "");
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);

  // Playback state lives in a shared store so the navbar can hide while the
  // video plays (HeroVideo and Navbar are siblings far apart in the tree).
  const isPlaying = useHeroVideoStore((s) => s.isPlaying);
  const setPlaying = useHeroVideoStore((s) => s.setPlaying);

  const { lock, unlock } = useLenis();

  // While playing: stop page scrolling (Lenis stop + body overflow hidden)
  // AND hide the scrollbar entirely by marking <html>. On close/unmount the
  // scroll behavior is restored.
  useEffect(() => {
    if (isPlaying) {
      lock();
      document.documentElement.classList.add("video-playing");
    } else {
      unlock();
      document.documentElement.classList.remove("video-playing");
    }
    return () => {
      unlock();
      document.documentElement.classList.remove("video-playing");
    };
  }, [isPlaying, lock, unlock]);

  // If this component unmounts mid-playback (e.g. route navigation), release
  // the global scroll lock and let the navbar come back.
  useEffect(() => () => setPlaying(false), [setPlaying]);

  // Raw cursor position → smoothed with a spring so the circle trails the
  // cursor with a slight, natural lag instead of snapping to it. Owned here;
  // consumed by PlayCircle (the spring + drift live in that component).
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Open the in-place player. Called directly from the user's click (a user
  // gesture), so the unmuted play() is allowed by the browser autoplay policy.
  // NOTE: sound only works if the source video file actually has an audio
  // track — the current /videos/*.mp4 files are silent (no mp4a track in the
  // container), which is also why Chrome disables the volume control.
  const openPlayer = () => {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(true);
    video.muted = false;
    video.play().catch(() => {
      /* rejected — the native controls are available for manual play */
    });
  };

  const closePlayer = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.muted = true;
    setPlaying(false);
  };

  // Any click over the hero opens the player, EXCEPT on real interactive
  // elements (the "play" PlusTextBtn link, the close button).
  const handleSectionClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isPlaying) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    openPlayer();
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={handleSectionClick}
      className="relative h-screen w-full cursor-none overflow-hidden bg-black md:cursor-auto"
    >
      {/* The hero's own full-bleed video. Paused (poster frame) and silent by
          default; while playing it gets Chrome's native controls. In-place, so
          it scrolls away with the hero naturally instead of floating over the
          page as a fixed background. */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        controls={isPlaying}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Decorative gradient — pointer-events-none so clicks pass through to
          the section handler below. Lightens while playing. */}
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${
          isPlaying
            ? "bg-black/20"
            : "bg-linear-to-t from-black/80 via-black/20 to-black/40"
        }`}
      />

      {/* Cursor-following play circle — hidden while playing, pointer-events-
          none so it never blocks clicks. */}
      <PlayCircle
        mouseX={mouseX}
        mouseY={mouseY}
        visible={hovering && !isPlaying}
      />

      {/* Close button — only while playing. */}
      {isPlaying && (
        <button
          type="button"
          aria-label="Close video"
          onClick={closePlayer}
          className="absolute top-4 right-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X size={24} strokeWidth={1.5} />
        </button>
      )}

      {/* Hero copy — shown on the poster, hidden while playing so the video
          + controls stay clean. */}
      {!isPlaying && (
        <HeroSectionText
          firstLine={firstLine}
          secondLine={secondLine}
          btn={btn}
        />
      )}
    </section>
  );
}
