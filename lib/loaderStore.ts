import { create } from "zustand";

interface LoaderState {
  isLoading: boolean;
  progress: number;
  setProgress: (progress: number) => void;
  setLoaded: () => void;
  reset: () => void;
}

export const useLoaderStore = create<LoaderState>()((set) => ({
  isLoading: true,
  progress: 0,

  setProgress: (progress) =>
    set({
      progress: Math.min(Math.max(progress, 0), 100),
    }),

  setLoaded: () =>
    set({
      progress: 100,
      isLoading: false,
    }),

  reset: () =>
    set({
      progress: 0,
      isLoading: true,
    }),
}));
