import { create } from "zustand";
import type Lenis from "lenis";

interface LenisState {
  lenis: Lenis | null;
  setLenis: (instance: Lenis | null) => void;
  lock: () => void;
  unlock: () => void;
  
}

export const useLenis = create<LenisState>()((set, get) => ({
  lenis: null,

  setLenis: (instance) => set({ lenis: instance }),

  lock: () => {
    get().lenis?.stop();
    // Belt-and-suspenders: Lenis handles non-native scrolling, but
    // keeping `overflow: hidden` also covers any edge case where
    // Lenis isn't mounted yet.
    document.body.style.overflow = "hidden";
  },

  unlock: () => {
    get().lenis?.start();
    document.body.style.overflow = "";
  },
}));