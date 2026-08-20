"use client";

import { useEffect, useState } from "react";
import AkoLightingLogo from "@/components/ui/HengeLogo";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isGone, setIsGone] = useState(false);

  useEffect(() => {
    const maxProgress = 90 + Math.floor(Math.random() * 8);
    let current = 0;

    const interval = setInterval(() => {
      if (current < maxProgress) {
        current += Math.floor(Math.random() * 2);
        setProgress(Math.min(current, 100));
      } else {
        clearInterval(interval);
        // Simulate completion after a short delay
        setTimeout(() => {
          setProgress(100);
          setIsReady(true);
        }, 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // After the fade-out transition completes, unmount the preloader entirely
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => setIsGone(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (isGone) return null;

  return (
    <div
      id="loader"
      className={`
        fixed inset-0 z-1000 
        bg-background 
        flex flex-col items-center justify-center
        transition-all duration-1000 ease-[cubic-bezier(0.74,0,0.15,0.99)] delay-200
        ${isReady ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}
      `}
    >
      {/* AKO Lighting Logo */}
      <AkoLightingLogo className="w-20 h-auto fill-white transition-opacity duration-500 ease-out" />

      {/* Progress Bar */}
      <div
        className={`
          w-20 
          h-0.5 
          bg-white 
          mt-4 
          origin-left
          transition-transform duration-100 ease-out
          ${isReady ? "transition-duration-200" : ""}
        `}
        style={{
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  );
}