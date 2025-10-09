import { create } from "zustand";
import { Breakpoints, Store } from "../types";

export const useStore = create<Store>((set) => ({
  baseRemPx: 16,
  breakpoints: [
    { id: "min", label: "375", value: 375 },
    { id: "mid", label: "1024", value: 1024 },
    { id: "max", label: "1440", value: 1440 },
  ],
  tokens: [],
  setBaseRemPx: (baseRemPx) => set({ baseRemPx }),
  setBreakpoints: (breakpoints: Breakpoints) => set({ breakpoints }),
  setTokens: (tokens) => set({ tokens }),
}));
