import { create } from "zustand";

interface HeroVideoState {
  /** True while a HeroVideo instance is mid-playback. Shared so sibling
   *  UI (the navbar) can react to playback state. */
  isPlaying: boolean;
  setPlaying: (playing: boolean) => void;
}

export const useHeroVideoStore = create<HeroVideoState>()((set) => ({
  isPlaying: false,
  setPlaying: (playing) => set({ isPlaying: playing }),
}));