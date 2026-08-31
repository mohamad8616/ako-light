"use client";

import AkoLightingLogo from "@/components/ui/Logo";
import { useLoaderStore } from "@/lib/loaderStore";
import { useEffect, useState } from "react";

export default function Preloader() {
  const { isLoading, progress } = useLoaderStore();
  const [isGone, setIsGone] = useState(false);

  // After the fade-out transition completes, unmount the preloader entirely
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsGone(true), 900);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isGone) return null;

  return (
    <div
      id="loader"
      className={`bg-background fixed inset-0 z-1000 flex flex-col items-center justify-center transition-all delay-200 duration-1000 ease-[cubic-bezier(0.74,0,0.15,0.99)] ${!isLoading ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"} `}
    >
      {/* AKO Lighting Logo */}
      <AkoLightingLogo className="h-auto w-20 fill-white transition-opacity duration-500 ease-out" />

      {/* Progress Bar */}
      <div
        className={`bg-background-secondary mt-4 h-0.5 w-20 origin-left transition-transform duration-100 ease-out`}
        style={{
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  );
}
