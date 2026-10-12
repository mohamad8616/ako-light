"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useMotionValue } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import HeroSectionText from "../HeroSectionText";
import VideoModal from "./VideoModal";
import PlayCircle from "./PlayCircle";

type HeroVideoProps = {
  firstLineKey?: string;
  secondLineKey?: string;
  btnKey?: string;
  /**
   * The hero's video — the still frame behind the copy AND the film the modal
   * plays.
   *
   * OPTIONAL since Pass D.1's follow-up: /about and /s34 no longer ship a stock
   * film of their own; they take this slot's video, and "no video chosen" is a
   * real state. With none, the hero keeps its black background and its copy and
   * simply has no film to play — the section never becomes a broken element.
   */
  videoSrc?: string;
  /** Poster image shown in the hero. Falls back to the first video frame
   *  (`video.poster` or `<video>` `preload="metadata"`) if not provided. */
  posterSrc?: string;
  firstLine?: string;
  secondLine?: string;
  btn?: string;
};

export default function HeroVideo({
  firstLineKey,
  secondLineKey,
  btnKey,
  videoSrc,
  posterSrc,
  firstLine: firstLineProp,
  secondLine: secondLineProp,
  btn: btnProp,
}: HeroVideoProps) {
  const { t } = useLanguage();

  const firstLine = firstLineKey ? t(firstLineKey) : (firstLineProp ?? "");
  const secondLine = secondLineKey ? t(secondLineKey) : (secondLineProp ?? "");
  const btn = btnKey ? t(btnKey) : (btnProp ?? "");

  // Whether the standalone video player modal is open. Every playback
  // concern — portal, scroll lock, Escape, close button, navbar
  // coordination — lives inside VideoModal; this component only decides
  // when to open it.
  const [open, setOpen] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Raw cursor position → consumed by PlayCircle.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Any click over the hero opens the player, EXCEPT on real interactive
  // elements (the "play" PlusTextBtn link) — and except when there is no film
  // to play, in which case a modal would open onto nothing.
  const handleSectionClick = (e: React.MouseEvent<HTMLElement>) => {
    if (open || !videoSrc) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    setOpen(true);
  };

  return (
    <>
      <section
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={handleSectionClick}
        className="relative h-screen w-full cursor-none overflow-hidden bg-black md:cursor-auto"
      >
        {/* Hero poster: a static image (or video preview) shown behind the
            text. The video plays in the modal, not here. */}
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : videoSrc ? (
          // Fallback: muted, paused video as a still poster frame.
          <video
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={videoSrc} />
          </video>
        ) : null}

        {/* Decorative gradient — makes the hero text legible on top of the
            poster. `pointer-events-none` so clicks pass through to the
            section handler. */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/20 to-black/40" />

        {/* Cursor-following play circle — visible only on the poster
            (while the player is closed). */}
        <PlayCircle
          mouseX={mouseX}
          mouseY={mouseY}
          visible={hovering && !open}
        />

        {/* Hero copy — shown on the poster, hidden while the player is up
            so the section is unobstructed behind the modal's backdrop. */}
        {!open && (
          <HeroSectionText
            firstLine={firstLine}
            secondLine={secondLine}
            btn={btn}
          />
        )}
      </section>

      {/* Standalone fullscreen video player — owns the portal to <body>,
          scroll lock, close button, Escape handling and playback state.
          Only mounted when there is a film to play. */}
      {videoSrc ? (
        <VideoModal
          open={open}
          videoSrc={videoSrc}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
