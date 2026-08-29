"use client";

import { useEffect, useState } from "react";
import HengeLogo from "@/components/ui/HengeLogo";

export default function Loading() {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

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

  return (
    <div
      id="loader"
      className={`bg-background pointer-events-none fixed inset-0 z-1000 flex flex-col items-center justify-center transition-all delay-200 duration-1000 ease-[cubic-bezier(0.74,0,0.15,0.99)] ${isReady ? "opacity-0" : "opacity-100"} `}
    >
      {/* HENGE Logo */}
      <HengeLogo className="h-auto w-20 fill-white transition-opacity duration-500 ease-out" />

      {/* Progress Bar */}
      <div
        className={`mt-4 h-0.5 w-20 origin-left bg-white transition-transform duration-100 ease-out ${isReady ? "transition-duration-200" : ""} `}
        style={{
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  );
}
