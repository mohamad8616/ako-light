// app/loading.tsx
"use client";

import { useEffect, useState } from "react";

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
      className={`
        fixed inset-0 z-1000 
        bg-background 
        flex flex-col items-center justify-center
        transition-all duration-1000 ease-[cubic-bezier(0.74,0,0.15,0.99)] delay-200
        pointer-events-none
        ${isReady ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Logo */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 40"
        className="w-35 sm:w-40 md:w-45 lg:w-50 h-auto fill-white transition-opacity duration-500 ease-out"
      >
        <text
          x="0"
          y="30"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="28"
          fontWeight="bold"
          fill="currentColor"
          letterSpacing="2"
        >
          AKO Lighting
        </text>
      </svg>

      {/* Progress Bar */}
      <div
        className={`
          w-35 sm:w-40 md:w-45 lg:w-50 
          h-0.5 
          bg-white 
          mt-4 sm:mt-5 
          rounded-full
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
